# One source for a station that is a schedule (2026-09-15)

The station is a list of programmes, each a file in R2 or a live mount, and
every client works out from the wall clock which one is playing and how far in.
That is fine on a page. The question is what happens on **an iPhone, added to
the home screen, with the screen off**, where a swapping source and a WebAudio
mix are exactly what iOS suspends.

Every claim below carries a tag:

| tag | means |
|---|---|
| **MEASURED** | a number produced today, with the time it was taken and what was run |
| **READ** | a vendor, a standards body or a file in this repo says so, with the place |
| **INFERRED** | my arithmetic on those, which can be wrong |

Three things were driven: **desktop Safari 26.6.2** (`AppleWebKit/605.1.15`, macOS
26.6.2) over `safaridriver`, **HeadlessChrome 152.0.0.0** over CDP, and a
throwaway Cloudflare Worker named `positron-probe-station`. **No iPhone was
touched.** Desktop Safari is the same engine family and it settles the format
questions; it cannot settle the backgrounding questions, and §8 says exactly
which those are.

Everything ran against three 5-minute MP3s cut with `ffmpeg -c copy` out of the
existing 90-minute, 128 kbit/s CBR archive object
`https://positron-vain.kristjan-jansen.workers.dev/a/vain/20260915-155124-679bda98a58c7612/audio.mp3`
(86 400 983 bytes, 44 100 Hz stereo, `mime_codec_string=mp4a.40.34`, ID3v2 tag
of 44 bytes, one Xing/`Info` frame, then 417/418-byte frames with no
discontinuity). Scratch rig in this session's scratchpad: `probe/server.mjs`
(playlist generator, packed-audio segmenter, endless body), `probe/index.html`
(the page under test), `probe/drive-safari.mjs`, `probe/drive-chrome.mjs`,
`probe/scan.mjs` (MPEG frame walker).

---

## 0. The short answer

**One of the three is obviously right and the other two are not.**

The single continuous source is **an HLS media playlist whose segments are
`#EXT-X-BYTERANGE` ranges into the programme files**, generated **in a Worker**,
played by **one `<video>`/`<audio>` element with `src` set to the playlist**.
Nothing is re-encoded, nothing is re-muxed, the MP3 goes out byte for byte, and
**no JavaScript runs while it plays**. That last clause is the whole answer to
the iPhone question: a player that needs no main thread cannot be starved by a
main thread that has been suspended.

The compilation happens in the Worker, and what it compiles is **not audio**. It
is about 600 bytes of text every 11 seconds saying which byte ranges of which
objects are the next ten seconds of the station. The audio is concatenated by
the player's own demuxer, in C, below JavaScript.

MEASURED, 2026-09-15 17:18Z, desktop Safari against a live sliding-window
playlist: playhead **1.000x over 103.66 s**, playlist re-fetched every **11.0 s**
(which is the `EXT-X-TARGETDURATION`), **14 segment range GETs in 100 s**, and
the schedule rolled from one programme file into the next with no error. Then,
MEASURED at 17:37Z with the server stopped for **100 seconds**, longer than the
buffer: the playhead stalled at 79.985 and **resumed by itself at 143.51 s wall
with no JavaScript involved**, `error` null throughout.

Against that, MEASURED at 17:35Z, the never-ending `audio/mpeg` body under a
**15-second** outage: `pause@30.45` then **`ended@30.45`**, playhead frozen for
the remaining 60 seconds, `paused: true`, `error: null`, no recovery. A dropped
endless stream is reported as a programme that **finished**, which is the worst
shape a failure can take, and getting out of it needs JavaScript at precisely
the moment JavaScript is least reliable.

MSE is not wrong, it is just unnecessary. It works, and §3 has the numbers, but
it buys nothing over the playlist and it costs a feeding loop on the main
thread.

---

## 1. MP3 survives. Nothing has to be re-muxed, and re-muxing to MP4 would break it

The sharp question was whether Safari's MSE accepts raw MP3, because MSE
implementations commonly want fMP4 or ADTS AAC.

MEASURED, 2026-09-15 17:01Z, desktop Safari 26.6.2, `isTypeSupported` over a
battery, on both constructors:

| mime | `MediaSource` | `ManagedMediaSource` | Chrome 152 `MediaSource` |
|---|---|---|---|
| `audio/mpeg` | **true** | **true** | **true** |
| `audio/mp3` | true | true | false |
| `audio/mpeg; codecs="mp3"` | true | true | false |
| `audio/mp4; codecs="mp3"` | false | false | false |
| `audio/mp4; codecs="mp4a.40.34"` | **false** | **false** | **false** |
| `audio/mp4; codecs="mp4a.69"` | false | false | false |
| `audio/mp4; codecs="mp4a.6B"` | false | false | false |
| `audio/mp4; codecs="mp4a.40.2"` | true | true | true |
| `audio/aac` | true | true | true |

Two things fall out, and the second is the one that would have cost a day.

**Raw MP3 is accepted, and `audio/mpeg` is the one spelling both engines agree
on.** Chrome refuses `audio/mp3` and `audio/mpeg; codecs="mp3"` while accepting
`audio/mpeg`; Safari accepts all three. Write `audio/mpeg` and nothing else.

**MP3-in-MP4 is dead on both engines.** `mp4a.40.34` is exactly what `ffprobe`
reports as this file's `mime_codec_string`, and it is what you would reach for
if you decided to re-mux MP3 into fMP4 for MSE. Every browser here refuses it,
and desktop Safari's `canPlayType('audio/mp4; codecs="mp4a.40.34"')` returns the
empty string, which is "no" rather than "maybe". So the re-mux that looks like
the safe move is the one that breaks. INFERRED: a re-mux for MSE would have to
go to **AAC**, which means re-encoding, which means a generation loss and a CPU
bill on 86 MB objects, for a path that is not needed at all.

`isTypeSupported` is a claim, not a measurement, so it was checked by appending
real bytes. MEASURED, 17:13Z, Safari, plain `MediaSource`, `addSourceBuffer
('audio/mpeg')`, two appends of 160 078 bytes taken from **two different MP3
files**:

```
append 1  /seg/prog0.mp3/461/160078   updateend   buffered [[0, 10.005]]
append 2  /seg/prog1.mp3/461/160078   updateend   buffered [[0, 20.010]]
```

**One buffered range, not two.** MP3 frames from two separate files butt
together with no gap. The element then played 0.734 to 20.010 tracking the wall
clock one for one, and raised `waiting@20.01` at the end of what had been fed.

MEASURED, 17:24Z, twelve appends across three files: **one range `[[0, 119.98]]`**,
**1.000x over 40.15 s**, and a seek to 100 s landed at 100.187 and kept playing.
MEASURED, same page in Chrome 152: twelve appends, all `updateend`, **one range
`[[0, 119.98]]`, 1.000x**. Identical on both engines.

MEASURED, 17:23Z, `ManagedMediaSource` with `audio/mpeg` and
`disableRemotePlayback = true`: events `["ms:sourceopen", "ms:startstreaming"]`,
both appends `updateend`, `[[0, 20.01]]`, playing. So MMS takes raw MP3 too, and
it does raise `startstreaming`, which is the flag CLAUDE.md says Safari uses to
gate loading.

**So: MP3 survives unchanged, in the playlist path and in the MSE path, on both
engines. Nothing needs re-muxing anywhere.**

---

## 2. The ID3 PRIV question, settled on desktop WebKit and open on the phone

READ, RFC 8216 §3.4: *"Each Packed Audio Segment MUST signal the timestamp of
its first sample with an ID3 Private frame (PRIV) tag"*, owner identifier
`com.apple.streaming.transportStreamTimestamp`, payload *"a 33-bit MPEG-2
Program Elementary Stream timestamp expressed as a big-endian eight-octet
number"*. And on the client side: *"Clients SHOULD NOT play Packed Audio Segments
without this ID3 tag."*

**SHOULD NOT, not MUST NOT.** That is the whole reason this had to be measured
rather than reasoned about, because a raw byte range into somebody's MP3 cannot
carry a tag: the tag would have to be at the start of the segment, and the start
of the segment is in the middle of a file that was written years ago.

Three playlists were built over the same audio and the same frame boundaries,
and each was played by `video.src = <playlist>` with nothing else on the page.

| playlist | ID3 PRIV | rate | duration | seek to 610 s | errors |
|---|---|---|---|---|---|
| `packed.m3u8`, one URL per segment | present, correct | **0.995x** | 900.101 | 610.142, kept playing | none |
| `packed-nopriv.m3u8`, one URL per segment | **absent entirely** | **0.996x** | 900.101 | 610.158, kept playing | none |
| `byterange.m3u8`, `#EXT-X-BYTERANGE` into the raw files | **impossible, absent** | **1.000x** | 900.101 | 610.130, kept playing | none |

MEASURED 2026-09-15 at 17:14Z, 17:15Z and 17:17Z, desktop Safari 26.6.2, playing
from the start and then seeking to 610 s, which is inside the third programme
file.

**Desktop Safari does not enforce the ID3 PRIV requirement.** The three runs are
indistinguishable. The 900.101 s duration is the sum of ninety `#EXTINF` values,
so Safari took its timeline from the playlist, which is what it does when a
packed audio segment has no timestamp of its own to disagree with.

⚠️ **This is a desktop measurement and the phone is not proven.** iOS ships a
different media stack from macOS in several places this project has already been
bitten by, and Apple's own validator (`mediastreamvalidator`, from the HLS
Tools) is not installed on this machine and was not run. What is settled: the
requirement is not enforced by the WebKit that ships in Safari 26.6.2 on macOS,
and a byterange playlist with no ID3 anywhere plays at 1.000x. What is open:
whether an iPhone agrees. §8 says how to close it.

INFERRED, and worth saying because it changes the fallback: if an iPhone does
refuse, the repair is **not** to abandon byte ranges. It is to put a Worker in
front of the segments that prepends the 63-byte ID3 tag, which is the
`/seg/<file>/<off>/<len>/<t>/1.mp3` route in the probe server, measured working
at 0.995x. That costs one Worker invocation per segment per listener instead of
zero, and it is a known quantity rather than a redesign.

---

## 3. The three candidates, measured

### Candidate 2 first, because it is the answer: a playlist of byte ranges

The station worker holds the schedule flattened to segments and answers
`/station.m3u8` with a sliding window computed from the wall clock. No
`#EXT-X-ENDLIST`, an `#EXT-X-MEDIA-SEQUENCE` that counts from the epoch, and an
`#EXT-X-PROGRAM-DATE-TIME` on every segment so a client can name the wall time
of what it is hearing:

```
#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:11
#EXT-X-MEDIA-SEQUENCE:354
#EXT-X-PROGRAM-DATE-TIME:2026-09-15T17:17:07.428Z
#EXTINF:10.004898,
#EXT-X-BYTERANGE:160078@3842342
/media/prog2.mp3
```

MEASURED, 17:18Z, Safari, 103.66 s:

- playhead **1.000x**, no drift
- playlist re-fetched at **exactly 11.0 s**, which is the target duration
- **11 playlist GETs and 14 segment range GETs** in 100 s
- buffered lead about **60 s**; `seekable` about **27 s**, which is the window
- rolled from `prog2.mp3` into `prog0.mp3` at the loop with no error
- `stalled` every ~11 s, which is the player reaching the end of the window and
  waiting for the next playlist, not a fault: the rate was 1.000x throughout

MEASURED, 17:33Z, the server stopped for **20 s** mid-run: **no stall at all**,
0.992x over 121 s. The 60-second lead absorbed it.

MEASURED, 17:37Z, the server stopped for **100 s**, longer than the lead: the
playhead held at 79.985 for about 80 seconds and then **resumed on its own**,
`error` null the whole way, and finished the run playing. No page code ran. The
media stack retried the playlist and picked back up.

MEASURED at 17:31Z and 17:32Z in Chrome 152 with the vendored **hls.js 1.7.1**
(`proto/flipper/hls.min.js`):
byterange VOD playlist **1.000x, zero hls.js errors**, events
`MANIFEST_PARSED / LEVEL_LOADED / FRAG_LOADED / BUFFER_APPENDED`, duration
900.101. The live station playlist: **1.000x, zero errors**. So the same
playlist serves WebKit natively and Chromium through hls.js.

🔴 **MEASURED, and this one would have been a bill: a VOD playlist makes Safari
download the entire station immediately.** At 17:17Z the `#EXT-X-PLAYLIST-TYPE:VOD`
byterange playlist caused Safari to fetch **all 90 ranges, about 14.4 MB, 900
seconds of audio, in 463 milliseconds** (first range request logged at
17:17:01.274, last at 17:17:01.731), before playing a note. The live sliding-window
form fetched **14 segments in 100 seconds**. Same audio, same byte ranges; the
difference is one tag. hls.js did not do this (it held 60 s), so **this is a
WebKit behaviour and the suite would not have caught it**.

### Candidate 3: a Worker holding a paced response

It plays, and it cannot recover.

MEASURED, 17:20Z, Safari against a local never-ending `audio/mpeg` body paced at
128 kbit/s: **1.000x over 60.6 s**, `duration` NaN, `seekable [[0, NaN]]`. Safari
made a two-byte probe range request and then one open-ended GET. One held
response per listener.

MEASURED, 17:35Z, the same with the server stopped for 15 seconds:

```
events: ["waiting@0.00","playing@0.00","stalled@28.14","pause@30.45","ended@30.45"]
playhead frozen at 30.45 for the remaining 60 s   paused: true   error: null
```

**`ended`, not `error`.** The element believes the programme finished. Nothing in
the media stack will reconnect, because from its point of view there is nothing
wrong. Recovery is a page that notices and reassigns `src`, which is JavaScript
on a timer, which is the thing §5 measures being clamped to twenty seconds.

The server side is fine, and better than expected. MEASURED against the deployed
throwaway Worker `positron-probe-station`, a `ReadableStream` generated in the
Worker and paced with `setTimeout`, one line per second: started 17:29Z and
**held 1706 seconds with zero drift** (line 1706 delivered at 1706.000 s), still
running when this was written. READ, <https://developers.cloudflare.com/workers/platform/limits/>:
*"There is no hard limit on duration for HTTP-triggered Workers. As long as the
client remains connected, the Worker can continue processing, making
subrequests, and streaming a response body."* READ, `workers/shout/NOTES.md:83-91`:
a relayed Icecast body held **600 s at 128.77 kbps** through the edge with one
gap of 1684 ms.

🔴 **MEASURED, and it is a trap with a number: a Worker cannot fetch another
Worker on the same account's `workers.dev`.** The probe's `/endless` route
range-read the vain archive object every 16 KiB and answered **200 with zero
bytes**. A diagnostic route reported the origin answering **404 with the body
`error code: 1042`**. So a station Worker must reach R2 through a **binding** or
a **custom domain**, never by fetching a sibling Worker's URL. Separately, a
per-chunk read is the wrong shape anyway: at 16 KiB it is eight subrequests a
second against a cap of **50 (free) or 10 000 (paid) per invocation** (READ, the
same limits page), so an hour of audio needs one `fetch` of the object and a
paced read of that one body.

### Candidate 1: MSE fed from the schedule

Technically sound, and it buys nothing.

§1 has the numbers: raw MP3, twelve segments, three files, one contiguous
buffered range, 1.000x, seekable, on both engines, with plain `MediaSource` and
with `ManagedMediaSource`.

What it costs is a feeding loop. Something has to notice the buffer draining and
call `appendBuffer` again, and that something is the main thread. READ,
CLAUDE.md: *"Safari can close a ManagedMediaSource under you. Every buffer is
dumped."* READ, `src/low-latency-player.js:465-471`: *"mediaSourceRequiresReset
 ... has now appeared in three separate iPhone runs, and each time every buffer
is dumped."* Recovering from that is also main-thread work.

INFERRED: MSE earns its place only where the playlist cannot express what you
want. A schedule of whole programmes is exactly what a playlist is for.

---

## 4. Frame alignment: required, but not for the reason you would guess

The probe server walks MPEG frame headers (`probe/scan.mjs`) and cuts segments at
frame boundaries, 383 frames each, 10.004898 s at 44 100 Hz. A naive
implementation would slice fixed byte counts from the top of the file. Both were
measured.

MEASURED, 17:41Z, Safari against a deliberately misaligned playlist (fixed
160 078-byte chunks from offset 44, ignoring where frames start): **1.000x, no
error, duration 300.042**. It plays.

The obvious worry is a click at every seam. MEASURED, and there is not one. The
quantity in question is the discontinuity between neighbouring samples, so that
is what was measured, over 60 s decoded to 16-bit PCM:

| stream | max jump between adjacent samples | jumps over 2000 |
|---|---|---|
| `prog0.mp3` direct | 184 | 0 |
| aligned byterange playlist | 356 | 0 |
| misaligned byterange playlist | 217 | 0 |

Out of a full scale of 32 768. The decoder resyncs on the next sync word and
loses at most one 26 ms frame, which is inaudible.

⚠️ **Align anyway, and here is the real reason.** A misaligned segment decodes
to slightly less audio than its `#EXTINF` declares, because the partial frame at
each end is discarded. A wall-clock station is a machine for turning declared
durations into positions, so a systematic shortfall of a fraction of a frame per
segment is a drift that accumulates for as long as the station is up. Alignment
costs one pass over each object at ingest and removes the whole class.

INFERRED from the format, not measured: this is also where
`plan-vain-upload.md` §9's second condition bites. A **CBR** file indexes
exactly; a **VBR** file with no Xing or VBRI header does not, and the index must
come from a frame walk rather than from arithmetic. The frame walk is needed for
alignment regardless, so it answers both at once.

---

## 5. What a backgrounded WebKit page does, as far as a laptop can show it

This is the part that decides between the candidates, and it is the part the
laptop can only half answer.

🔴 **MEASURED, four separate runs: the page's `setTimeout` was clamped to about
twenty seconds while the media element beside it played at exactly 1.000x.**
A `setTimeout(step, 250)` chain in the automation window was served at
250 to 450 ms for the first few seconds and then at **19 463 ms, 19 836 ms,
19 921 ms and 20 065 ms**. In the same runs the playhead advanced 1.000x with no
gaps. In two other runs there was no clamp at all (max delta 253 ms over 256
ticks). `document.visibilityState` read `hidden` in the early runs and `visible`
in the later ones and **did not predict the clamp**, so the trigger is something
else, most likely window occlusion. The trigger is not claimed here. The
consequence is, and it is the same either way:

**The media element is not throttled. The JavaScript beside it is.**

That single asymmetry is the argument. A design where the audio is produced by
the media pipeline survives; a design where JavaScript must run on a schedule to
keep the audio alive does not.

It also broke the harness before it became a finding. The first probe page timed
its own playback with `setTimeout` and reported four samples in a minute, which
reads as a dead page. The sampler was moved into the driver, which reaches in
over WebDriver and is not subject to the page's timer queue.

⚠️ **The pages ran MUTED and that matters here.** WebKit is documented to exempt
pages with audible playback from throttling, and every measurement in this
document was taken with `muted = true`, because Safari autoplays muted media
without a gesture and this harness has no trusted gesture to offer (see §7). So
the clamp measured above may be softer on a page that is actually making sound.
It cannot be harder. And on an iPhone with the screen locked, READ,
`research/browser-av-editors-2026-08.md:222-224`: *"On iOS full suspension after
backgrounding is 'very intentional' per an Apple engineer."*

Two facts this repo already owns point the same way, both READ:

- `demo/shell/mp3-stream.mjs:11-20`: on an iPhone (iOS 18.7, Safari 26.6.1)
  `createMediaElementSource` on a playing `<audio>` fed an analyser that read
  **0.0000 on every line for fifty seconds**, while a 440 Hz oscillator through
  the same analyser read 0.33 to 0.80. **WebKit does not route a media element
  into the graph on iPhone.** So a design that mixes the schedule in WebAudio is
  not merely fragile on a backgrounded phone, it is silent on a foregrounded
  one.
- `demo/radio/index.html:1446-1467`: iOS has a fourth `AudioContext` state,
  `interrupted`, it does not come back on its own, and `resume()` from a timer
  is refused exactly when it is needed.

---

## 6. Cost per listener, and where the Worker sits

At 128 kbit/s the audio is **57.6 MB per listener-hour** on every candidate.
That is the bitrate and no design changes it. What differs is the request shape.

**Candidate 2**, INFERRED from the measured 11.0 s playlist cadence and 10.005 s
segments:

| per listener-hour | count | note |
|---|---|---|
| playlist requests | **327** | about 600 bytes each for a six-segment window, so ~0.2 MB/hour |
| segment range GETs | **360** | 160 078 bytes each |
| Worker invocations | **327** | the playlist only |
| R2 reads | **360** | straight from the bucket, no Worker in the path |

MEASURED against the real archive object at 17:42Z, a segment-sized Range GET
from four offsets across the 86 MB file: **206 in 0.21 to 0.34 s time to first
byte**, 0.27 to 0.41 s total. Well inside a ten-second segment budget. READ,
`plan-vain-upload.md` §9 and <https://developers.cloudflare.com/r2/buckets/cors/>:
an R2 custom domain with a CORS policy returns CORS headers by itself, so the
segments need no Worker at all. Native HLS does not need CORS; hls.js does.

🔴 **MEASURED 2026-09-15 17:50Z, and it decides where the audio lives: Workers
Static Assets does not honour Range.** A `Range: bytes=461-1460` request for a
4 801 140-byte MP3 served from an `assets` directory answered **200 with the
whole file** and **no `accept-ranges` header**, and it did the same when the
Range header was set explicitly on a request made to the `ASSETS` binding from
inside the Worker. No Range means no `#EXT-X-BYTERANGE`, so the station's media
**must** come from R2 or from another origin that answers 206. The probe worker
was built on static assets first and had to be moved to an R2 bucket for exactly
this. R2 answers correctly: MEASURED at 17:52Z through the probe's own handler,
`206` with `content-range: bytes 461-160538/4801140`.

**Candidate 3**: **one** Worker invocation per listener-hour, held open for the
whole hour, with all 57.6 MB flowing through the Worker. Fewer invocations,
every byte metered through compute, and one held connection per listener.

INFERRED: 327 invocations of a Worker that concatenates strings is not a cost
worth optimising, and it is the version where the bytes come out of R2 rather
than out of a Worker. Candidate 2 wins on cost as well as on recovery, which is
unusual and worth noticing.

⚠️ None of this is Cloudflare Stream and none of it is the storage-minute cap.
READ, CLAUDE.md: Stream bills minutes and this account's 1000 storage-minute cap
blocks new live streams when it fills. A byte range out of R2 is not a Stream
minute.

---

## 7. Harness facts, so the next person does not pay for them again

🔴 **`safaridriver`'s element click reports success and dispatches nothing.**
MEASURED 2026-09-15 16:5xZ: `POST /session/<id>/element/<id>/click` answered
`null`, and the page's own click counter stayed at **0** through three of them,
while a `document.getElementById("go").click()` immediately after took the
counter to 1. So the endpoint that looks like a user gesture is the one that is
not a gesture and is not a click either. `demo/verify-safari.mjs` avoids this by
clicking through injected script rather than through the driver.

🔴 **`POST /session/<id>/actions` hangs with no response at all.** No error, no
timeout of its own. Every WebDriver call in a harness needs a deadline or a hang
is indistinguishable from a slow page.

Consequence: **there is no trusted user gesture available from this harness**, so
every page ran muted. Audibility was not measured in the browser. It was
measured outside it: `ffmpeg -af volumedetect` over 20 s of each path reads
`mean_volume -24.5 dB` on the source file, on the aligned byterange playlist and
on the packed playlist alike.

**A stuck run leaves Safari paired.** The next session dies on `POST /session`
with *"The Safari instance is already paired with another WebDriver session."*
The automation instance is a separate process (`Safari ... --automation`) from a
user's own Safari, so killing that pid is safe and is the fix.

**`node drive.mjs ... | head -5` kills the driver.** `head` closes the pipe, node
takes SIGPIPE, and the run dies mid-measurement while printing a plausible
partial result. Redirect to a file. That is CLAUDE.md's *"no pipes"* rule in a
new costume.

**ffmpeg's HLS demuxer keeps a segment-extension allowlist.** A segment URL that
does not end in a known extension is refused as *"Invalid data found when
processing input"*, which reads as a broken segment and is a broken URL shape.
The probe server puts `.mp3` at the end of its generated segment paths for this
reason alone.

**`AudioContext.prototype.audioWorklet` throws in Safari** when read as a
property of the prototype: *"The BaseAudioContext.audioWorklet getter can only be
used on instances of BaseAudioContext."* Use `'audioWorklet' in
AudioContext.prototype`. A capability probe that throws takes the whole probe
with it.

---

## 8. What still needs a real phone, stated so it can be closed

Four things, and only four. Everything else in this document is settled.

1. **Does it keep playing with the screen off?** The laptop shows the media
   element running at 1.000x while the page's timers are clamped. It cannot show
   what an iPhone does when the screen locks, and READ, an Apple engineer's
   position quoted in `research/browser-av-editors-2026-08.md:222-224` is that
   full suspension after backgrounding is intentional. INFERRED: a media element
   with a real audio session should survive, because that is how every radio web
   app on iOS works, but **inferred is not measured**.

2. **Does the lock screen show it, and can it be labelled?** MEASURED,
   `navigator.mediaSession` is present in desktop Safari 26.6.2 and in Chrome 152,
   and `setPositionState` exists in both. READ: **this repo has never used
   `mediaSession` anywhere.** There is no `MediaMetadata`, no artwork, no action
   handler in any page. So the lock-screen surface is entirely unexplored here
   and the first station page will be the first user of it.

3. **Does an iPhone enforce the ID3 PRIV rule that macOS ignores?** §2. One page
   with three playlists and `?report=1` answers it in a minute.

4. **Does the silent switch mute it?** READ, `demo/radio/index.html:1288-1305`:
   a page whose only output is WebAudio gets the `ambient` session, which the
   ring switch mutes, and `<audio>` gets `playback`, which it does not. MEASURED
   today: `navigator.audioSession` exists in desktop Safari and reports type
   `auto`. A playlist-driven element should get `playback` without being asked,
   and setting it explicitly inside the first gesture costs one line.

### The probe that closes all four, already deployed

**<https://positron-probe-station.kristjan-jansen.workers.dev/>**

Open that on the iPhone, add it to the Home Screen, press play, lock the screen,
wait ten minutes, then read
**<https://pub.positron.studio/logs?format=text>** and look for lines tagged
`station-probe`.

It is the design in §0 and nothing else: three programmes on a 900-second loop
in an R2 bucket, a playlist computed from a fixed epoch so two phones opened a
minute apart hear the same thing, and `#EXT-X-BYTERANGE` segments. The dropdown
picks between the three packing variants, so question 3 is a tap:

| choice | playlist | what it asks |
|---|---|---|
| byte ranges into the files | `/station.m3u8` | the design, with no ID3 anywhere |
| packed audio, no ID3 tag | `/nopriv.m3u8` | the same audio as separate segments, still no tag |
| packed audio, ID3 PRIV | `/priv.m3u8` | the same with the Apple timestamp, the control |

The page sets `navigator.audioSession.type = 'playback'` inside the gesture
(question 4), sets `mediaSession.metadata` (question 2), and reports one line per
**ten seconds of audio** rather than per ten seconds of wall clock, so the line
count in the log is itself the answer to question 1. Every line goes out on
`navigator.sendBeacon`, never on a batched shipper: READ, CLAUDE.md, a 2-second
batch does not survive the moment timers stop, which is the moment being
measured. The sampler rides `timeupdate`, which comes off the media pipeline,
because a `setInterval` here would report its own throttling as the element
stopping.

MEASURED 2026-09-15 17:52Z, the deployed probe from desktop Safari over the real
edge: `/priv.m3u8` **1.000x**, `/nopriv.m3u8` 0.948x with one stall, and
`/station.m3u8` 1.000x over 120.95 s with **1.000x steady state from 25 s
onward** after a start-up stall. MEASURED the same minute, all three playlists
decode under `ffmpeg` at `mean_volume -24.5 dB`, which is the source file's own
level, so the deployed thing is really making the audio and not a plausible
silence.

**Delete it when the four questions are answered:**
`npx wrangler delete --name positron-probe-station` and
`npx wrangler r2 bucket delete positron-probe-station`.

---

## 9. What this changes in `plan-vain-upload.md` §9

READ, §9: *"A plain object with Range, from an R2 custom domain. No HLS, and no
Worker in the read path."* Its reasons are about **archive playback of one
finished broadcast**, and for that they still hold: a scrubbing client wants a
byte range and a known length, and a static object is already that.

The station is a different client and it changes one of the three conditions §9
lists for when HLS would be worth it. §9 says HLS earns its place with multiple
renditions (still no), when a byte offset cannot become a time (still the VBR
question), and when the client cannot hold the whole thing. **A fourth condition
has now been measured: when the source must be one continuous thing that
outlives any single file, and must keep playing with no JavaScript.** That is
the station, and it is not the archive.

They coexist without contradiction, because the HLS layer adds no storage and no
encoding. **The same R2 objects serve both.** `/vain/` hands out the whole file
with Range for scrubbing; the station hands out a playlist of byte ranges into
those identical objects. Nothing is duplicated and nothing is transcoded. §9's
"no Worker in the read path" survives too, for the bytes: the only Worker is the
one writing 600 bytes of playlist every eleven seconds, and no audio passes
through it.

---

## 10. Everything measured today, in one table

All 2026-09-15. Safari is 26.6.2 on macOS 26.6.2 over `safaridriver`; Chrome is
HeadlessChrome 152.0.0.0 over CDP. Every page muted.

| at | what | result |
|---|---|---|
| 17:01Z | Safari capability matrix | `audio/mpeg` supported on `MediaSource` and `ManagedMediaSource`; `mp4a.40.34` refused by both |
| 17:13Z | Safari, MSE, raw MP3, 2 files | one range `[[0, 20.01]]`, plays to the end of what was fed |
| 17:23Z | Safari, `ManagedMediaSource`, raw MP3 | `sourceopen` + `startstreaming`, `[[0, 20.01]]`, playing |
| 17:24Z | Safari, MSE, 12 segments, 3 files | one range `[[0, 119.98]]`, 1.000x, seek to 100 lands at 100.187 |
| 17:14Z | Safari, packed audio **with** ID3 PRIV | 0.995x, 900.101 s, seek 610 to 610.142 |
| 17:15Z | Safari, packed audio **without** any ID3 | 0.996x, 900.101 s, seek 610 to 610.158 |
| 17:17Z | Safari, `#EXT-X-BYTERANGE` into raw MP3 | 1.000x, 900.101 s, seek 610 to 610.130 |
| 17:17Z | the same VOD playlist, request log | **90 ranges, ~14.4 MB, 900 s of audio, in 463 ms** |
| 17:18Z | Safari, live sliding-window station | 1.000x over 103.66 s, playlist every 11.0 s, 14 segments in 100 s |
| 17:20Z | Safari, endless `audio/mpeg` body | 1.000x over 60.6 s, one open-ended GET after a 2-byte probe |
| 17:33Z | station, server down 20 s | no stall, 0.992x over 121 s |
| 17:35Z | endless body, server down 15 s | **`pause` then `ended` at 30.45, never recovered** |
| 17:37Z | station, server down 100 s | stalled 80 s, **resumed by itself**, `error` null |
| 17:41Z | Safari, byte ranges not frame aligned | 1.000x, no error; max sample jump 217 of 32768, no clicks |
| 17:30Z | Chrome 152, capability matrix | `audio/mpeg` supported, `audio/mp3` refused, `mp4a.40.34` refused |
| 17:30Z | Chrome 152, MSE, 12 segments, 3 files | one range `[[0, 119.98]]`, 1.000x |
| 17:31Z | Chrome 152, hls.js 1.7.1, byterange playlist | 1.000x, zero hls.js errors, 60 s buffered |
| 17:32Z | Chrome 152, hls.js 1.7.1, live station | 1.000x, zero errors |
| 17:29Z on | Worker holding a generated paced body | **1706 s and counting, zero drift** |
| 17:50Z | Workers Static Assets, `Range: bytes=461-1460` | **200 and the whole 4 801 140 bytes, no `accept-ranges`** |
| 17:52Z | the same object out of R2 through the probe | 206, `content-range: bytes 461-160538/4801140` |
| 17:52Z | deployed probe, three playlists, through `ffmpeg` | all three `mean_volume -24.5 dB` |
| 17:55Z | deployed probe, byterange playlist, Safari | 1.000x over 120.95 s, 1.000x steady state |
| 17:28Z | Worker fetching a sibling Worker on `workers.dev` | **404, body `error code: 1042`** |
| 17:42Z | Range GET on the real 86 MB archive object | 206 in 0.21 to 0.34 s TTFB, four offsets |
| four runs | page `setTimeout(250)` beside a playing element | **clamped to 19.5 to 20.1 s while the playhead held 1.000x** |

**Clean up.** The throwaway Worker and its bucket exist only for §8:

```sh
npx wrangler delete --name positron-probe-station
npx wrangler r2 bucket delete positron-probe-station
```
