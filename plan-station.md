# plan-station: one playlist, live shows and archive files in the same line

`research/station-one-source-2026-09.md` settled the architecture and this plan
does not reopen it. In one paragraph: the station is **an HLS media playlist
whose segments are `#EXT-X-BYTERANGE` ranges into whole programme files in R2**,
written by a Worker, about 600 bytes of text every eleven seconds. Nothing is
re-encoded, nothing is re-muxed, and **no JavaScript runs in the page while it
plays**. That last clause is the whole reason this shape was chosen: a player
that needs no main thread cannot be starved by a main thread iOS has suspended,
and MEASURED in the research, the page's own `setTimeout` was clamped to about
twenty seconds while the media element beside it held 1.000x.

What the research did not settle is the thing a schedule is actually made of:
**a station is not a list of files, it is a list of slots, and some of those
slots are live shows that do not exist yet.** That is what this plan is about.
It is built, deployed and measured; §6 is the table.

Claims carry the same tags the research used: **MEASURED** is a number produced
here with what was run, **READ** is a file or a vendor saying so, **INFERRED** is
arithmetic on those.

---

## 1. A media playlist has no opinion about where its bytes come from

This is the fact the whole design rests on, and it is worth saying plainly
because it is easy to read past. A media playlist is a list of `#EXTINF`
durations and URIs. Nothing in it says the URIs are related, nothing says they
came from one encoder, and nothing says they existed before the playlist did.
The player concatenates them, in C, below JavaScript.

So the schedule Worker decides, **per slot**, where a segment's bytes come from,
and the two answers it can give are:

| slot kind | the segment is | written when | why that shape |
|---|---|---|---|
| **file** | `#EXT-X-BYTERANGE:<len>@<off>` into one whole object | at ingest, once | the object already exists and is also the archive download. Nothing is duplicated |
| **live** | one small object per chunk, no byterange | as the show happens | R2 cannot append to an object, and a 160 KB part is far under the 5 MiB multipart minimum |

Both land in the same flat list with a cumulative start time, and the playlist
that comes out cannot tell you which is which. That is the point.

⚠️ **The live case is packed audio with no ID3 timestamp, and the research
already measured that it plays.** RFC 8216 says clients SHOULD NOT play packed
audio segments without a `com.apple.streaming.transportStreamTimestamp` PRIV
frame. MEASURED in the research on desktop Safari 26.6.2: a playlist with the tag
ran 0.995x and one with no ID3 anywhere ran 0.996x, indistinguishable. **SHOULD
NOT, and an iPhone is still unproven** (research §8, question 3).

## 2. A live show is a file that does not exist yet

Radio 1965's server already records its own Icecast mount. READ,
`research/radio1965-server-2026-09-15.md:66-70`: a broadcaster sets
`save_stream`, `icecast_on_connect.sh` starts `ffmpeg -c copy` against the mount,
and `icecast_on_disconnect.sh` stops it, rsyncs the mp3 and turns the
`livestream` event into a `streamrecording` one.

🔴 **That recorder is NOT a live segmenter today, and the correction matters.**
It publishes **on disconnect**. While the show is on air there is one growing
file on their disk and nothing outside can read it, so a live slot cannot be
served from it as it runs. What makes it a segmenter is **one extra output on an
ffmpeg that is already running**:

```sh
ffmpeg -i <mount> \
  -c copy -f mp3 "$REC_DIR/$NAME.mp3" \
  -c copy -f segment -segment_time 10 -segment_format mp3 \
      -segment_list_flags +live "$SEG_DIR/%06d.mp3"
```

The first output is exactly what they have and the archive file is unchanged.
The second costs no decode and no encode: `-c copy` twice over the same demuxed
frames. A small uploader POSTs each finished piece to
`/live/<key>/append?seq=<n>`, and the show's slot in the schedule grows by ten
seconds every ten seconds. When the show ends, their existing on-disconnect step
publishes the whole seekable mp3, the slot becomes a **file** slot pointing at
it, and the station has a past.

MEASURED here: ffmpeg's segment muxer cuts mp3 **on frame boundaries**. Three
chunks out of `-f segment -c copy` walked to 383, 383 and 382 frames with
`resync: 0`, 10.004898 s, 10.004898 s and 9.978776 s. The station still walks
every uploaded chunk rather than trusting that, because the duration in the
playlist is what a wall-clock station turns into a position, and a declared
duration that is a fraction of a frame wrong drifts for as long as the station is
up.

🔴 **A LIVE SLOT'S EDGE IS THE LAST SEGMENT THAT EXISTS, NOT THE WALL CLOCK.**
This was written the other way first and it is wrong the other way. A recorder is
behind the sound by construction: a ten-second piece cannot be written until ten
seconds have happened. Locating the live edge by clock publishes a segment before
the recorder has cut it, which is a 404 on the live edge on every reload. For a
file slot the clock is right, because every byte already exists.

The same rule stops the timeline wrapping. A station of finished files loops: the
position is `(now - epoch) mod total`. **A station with an open live slot does
not loop**, because the slot has no end yet, and the player waits at the edge.

## 3. Latency, stated as the price rather than defended

MEASURED against the deployed station, five samples 2.5 s apart: the newest
segment the playlist offers is **1.2 to 8.6 s** behind the wall clock (it is the
segment `now` falls inside, so this oscillates across one segment), and a player
following the HLS rule of starting three segments from the end begins **21.2 to
28.6 s** behind.

INFERRED for the live path, adding the two costs the file path does not have: the
recorder cannot publish a ten-second piece until ten seconds have passed, and
MEASURED, an append to the deployed worker took 0.3 to 0.7 s. So a live show is
heard **roughly 31 to 40 seconds after it is spoken**.

That is the price and there is no clever way out of it at this segment length. It
buys the thing the research measured: a player that recovers from a dead server
by itself with no JavaScript, against an endless `audio/mpeg` body that fired
`ended` after fifteen seconds of outage and never came back. Shorter segments
would trade latency for request count linearly; LL-HLS parts would trade it for a
player that has opinions, and CLAUDE.md already holds the note that a latency
target inside one keyframe interval is unreachable. **A station is not a jam
session.** Thirty seconds behind is what broadcast radio over the internet has
always been.

## 4. Starvation must never look like an ending

🔴 **THERE IS NO `#EXT-X-ENDLIST` IN THIS WORKER AND THERE MUST NEVER BE ONE.**
A live playlist that runs out of segments is a station whose next thing has not
arrived. A playlist that says `ENDLIST` is a station that is over, and the
difference is invisible in the output and total in the player.

MEASURED, both locally and against the deployed edge: three chunks appended, then
nothing for 45 seconds, then three more.

| | local | deployed |
|---|---|---|
| audio pulled before the drought | 29.72 s | 29.72 s |
| output growth during the drought | **none, 45 s** | **none, 45 s** |
| exit after the next chunks arrived | 4.4 s | 4.2 s |
| audio written in total | **49.90 s** | **49.90 s** |
| windows below -50 dBFS | **0 of 498** | **0 of 498** |
| exit code | 0 | 0 |

It waited and then took the new segments. Nothing was lost across the drought:
not one 100 ms window fell below -50 dBFS anywhere in the output.

⚠️ **That is ffmpeg, and a browser is the client that matters.** The research
measured the browser half already and it is the same shape: a 100-second server
stop on this playlist form stalled the playhead at 79.985 and **resumed by
itself**, `error` null throughout, with no page code running. Both halves agree,
which is why this is stated as settled rather than as hoped.

## 5. Live, never VOD

🔴 A `#EXT-X-PLAYLIST-TYPE:VOD` byterange playlist made Safari fetch **90 ranges,
about 14.4 MB, 900 seconds of audio, in 463 milliseconds** before playing a note
(MEASURED, research §3). The live sliding-window form of the same audio fetched
14 segments in 100 seconds. Same bytes, same ranges, one tag.

hls.js did not do it, so the suite would not have caught it. There is no VOD tag
in this worker and no `#EXT-X-ENDLIST` for it to pair with.

## 6. What was built, and the numbers

`workers/station/worker.mjs`, one file, deployed at
**<https://positron-station.kristjan-jansen.workers.dev/station.m3u8>**.

- **R2 bucket `positron-station`** holds the media. 🔴 Not Workers Static
  Assets: MEASURED in the research, an asset directory answered a
  `Range: bytes=461-1460` with **200 and the whole 4 801 140-byte file**, and no
  Range means no `#EXT-X-BYTERANGE`, which is the entire design.
- **A Durable Object holds the running order** and the live segment lists. Not
  KV, because "how long does a schedule change take" has to be a measurable
  number and KV's propagation window is longer than the answer.
- **The frame walk runs once, at ingest**, and writes `index/<key>.json` beside
  the object: every segment's offset, length and exact duration, cut on frame
  boundaries.
- Public routes: `GET /station.m3u8`, `GET /now.json`, `GET /schedule`,
  `GET /media/<key>`. Writing routes need `Authorization: Bearer STATION_TOKEN`
  and answer **503 when no token is configured**, so an unconfigured deploy is
  closed rather than open.

Everything below is 2026-09-15, against three 40-second 128 kbit/s CBR MP3s cut
by `ffmpeg` at 220, 330 and 660 Hz, scheduled as a three-slot loop.

| what | result |
|---|---|
| frame walk, `proga.mp3` | 641 192 bytes, 1533 frames, **0 resyncs**, 40.045714 s, 4 segments |
| first segment | `160078@461`, 10.004898 s. Byte for byte the offsets the research's independent rig found |
| a byterange decoded alone | `ffprobe` 10.004875 s against 10.004898 declared, **23 µs out** |
| playlist, 6-segment window | **861 bytes**, `#EXT-X-TARGETDURATION:11`, no `ENDLIST`, no VOD tag |
| `/media/<key>` with a Range | **206**, `content-range: bytes 461-160538/641192`, `access-control-allow-origin: *` |
| **playing across a file boundary, deployed** | 59.97 s of audio in 41 s wall, **0 of 599 windows below -50 dBFS** |
| the tone at the boundary | 220 Hz to 330 Hz within one 100 ms window of the declared 40.045714 s seam |
| jump between adjacent samples at the seam | **20 of 32768**, against 19 for the 330 Hz tone's own steepest slope 5 s away. Nothing is added by the join |
| the same run, local | identical: 59.97 s, 0 quiet windows, seam 20 against 19 |
| **a schedule change, deployed** | PUT returned in **139 ms**, the new running order was in the playlist **255 ms** after the PUT began, first poll |
| the same, local | PUT 6 ms, visible at **9 ms** |
| **starvation, deployed** | 45 s with nothing to give: no ending, **49.90 s written**, exit 0, 0 quiet windows |
| how far behind live | newest segment 1.2 to 8.6 s, **a player starts 21.2 to 28.6 s** behind |
| an epoch in the future | **found and fixed here**: negative elapsed gave a negative loop number and a playlist with a header and no segments. Clamped to zero, which is a station that has not started |

### What it costs

INFERRED from the measured 11 s reload period and 10.005 s segments, per
listener-hour: **327 Worker invocations** (the playlist only, 861 bytes each, so
about 0.3 MB of text an hour) and **360 R2 range GETs** of 160 078 bytes. The
audio is 57.6 MB an hour at 128 kbit/s and no design changes that. Today the
segments are read through the Worker, which doubles the invocations; attaching a
custom domain with a CORS policy to the bucket takes the Worker out of the byte
path entirely, and the research measured R2 answering a segment-sized range in
0.21 to 0.34 s TTFB. **None of this is Cloudflare Stream and none of it touches
the 1000 storage-minute cap.** Storage today is 1.9 MB of test tone.

## 7. What is not done

- **No iPhone.** Research §8's four questions stand exactly as written: screen
  off, lock screen, ID3 PRIV, silent switch.
- **The live path has never carried a real broadcast.** It was driven with
  `-f segment` chunks of a test tone. The ffmpeg line in §2 is not yet running on
  Radio 1965's server and the uploader beside it is not written.
- **`/media/` still goes through the Worker.** Attaching a custom domain with a
  CORS policy to the bucket takes it out of the byte path and halves the
  invocations, and nothing measured here needs the Worker in the middle.
- **`/kit/` has no station component.** The page hand-rolls an `<audio>` element
  with native controls, which is the fourth transport surface in this project.

## 8. What was closed afterwards, and the numbers

Same day, against the same deploy.

### Retention (`sweep()` in `worker.mjs`, cron `*/5 * * * *`)

Two rules. A live chunk further than **24 segments** from the tail of its slot
loses its BYTES while its list entry stays, marked `x`; the entry has to stay
because the flattened list's length is the playlist's modulus and every start
time is the running sum before it, so dropping a head entry would make
`#EXT-X-MEDIA-SEQUENCE` go backwards. An object under `live/` that no slot
mentions at all loses everything, once it is more than **60 s** old. That age
guard exists because `/append` puts the object and THEN tells the Durable Object
about it.

`GET /objects` is the instrument as well as a route: `wrangler r2 bucket info`
read `object_count: 0` against a bucket holding twelve objects.

| step | before | sweep said | after |
|---|---|---|---|
| **the leak, as found** | 6 live objects, **962 818 B** | `orphaned 6, deleted 6` | **0 objects, 0 B** |
| 30 chunks on an open slot | 30 objects, 4 816 177 B | `expired 6, deleted 6` | 24 objects, 3 852 942 B, `000006 .. 000029` |
| the same sweep again | 24 objects | `deleted 0` | unchanged. The mark is what makes it idempotent |
| **the guard, proved by breaking the reference** | 24 objects | `too_young 24, deleted 0` | **24 objects, nothing deleted** |
| 62 s later, nothing else changed | 24 objects | `orphaned 24, deleted 24` | **0 objects, 0 B** |

### `#EXT-X-DISCONTINUITY`, which had never fired

`progd.mp3` is **22050/1 at 64 kbit/s** against the other three at 44100/2 and
128, scheduled between `proga.mp3` and `progb.mp3`. The frame walk read it
`1534 frames, 0 resyncs, 40.071837 s, 4 segments`.

| what | result |
|---|---|
| playlists carrying the tag | **19 of 24**, polled 5 s apart |
| `#EXT-X-DISCONTINUITY-SEQUENCE` | **0 -> 1 -> 2** across the run |
| where the tag lands | between `proga.mp3`'s last byterange and `progd.mp3`'s `80039@252` |
| ffmpeg across the seam | **89.1 s pulled, 0 of 891 windows below -50 dBFS** |
| the tone at the seam | 440 Hz to 330 Hz inside one 100 ms window at 20.0 s |
| a browser across the same seam | `progd.mp3 -> progb.mp3`, **1.000x**, element `error` null |

⚠️ **The tone cannot tell `progc` from `progd`.** Measured off the objects
themselves: proga 220, progb 330, **progc 440**, progd 440. §6 above says progc
is 660 and that is wrong. A Goertzel at the four frequencies labels the third
run `progd` for that reason and not because anything played twice. This is why
the seam claim is made about the `progd -> progb` boundary, which the tone can
actually separate.

### In a real browser (Chrome 1, headless, CDP)

| what | result |
|---|---|
| engine taken | **hls.js over MediaSource**. `ManagedMediaSource` false, so the native branch is correctly not taken |
| `canPlayType('application/vnd.apple.mpegurl')` | `"maybe"`, in a browser that cannot play it. The gate is on MMS for exactly this |
| it plays | 38.52 s of audio at 12 s, `error` null |
| across a file boundary | **1.000x**, 15.02 s of audio in 15.02 s of wall clock |
| `mediaSession` | title followed the programme: `progd.mp3` then `progb.mp3` |
| **starvation, 30 s, blocked from outside the page** | played out its **26.43 s** of buffer and stalled at 79.97 s |
| **and it did NOT come back, unaided** | still 79.97 s **40 s after the block was lifted**. `error` null, `ended` false, readyState 2 |
| with the watchdog below | **resumed by itself after 8.0 s**, one loader restart, 101.22 s and advancing |
| the page's own checks, under `demo/verify.mjs station` | **19/19** |

🔴 **THAT CONTRADICTS §4 AND §4 IS NOT WRONG.** The research measured recovery on
WebKit's native HLS, whose element keeps its own loader and retries forever.
hls.js exhausts its retries and then stops loading, and the element it feeds has
nothing of its own to try with. So "a player that recovers from a dead server by
itself with no JavaScript" is true of the native path and **false of the
MediaSource path**, which is every desktop Chrome and every Android.

🔴 **AND THE RECOVERY WATCHES THE PLAYHEAD, NOT THE ERROR EVENT.** The first fix
restarted the loader from `Hls.Events.ERROR`, which read correct and MEASURED as
three restarts during the outage and then nothing: once hls.js has given up it
stops loading, a loader that is not loading raises no more errors, and an
event-driven recovery has nothing left to fire on. The station came back and the
page sat at 69.97 s. A watchdog asking "has the sound moved in the last six
seconds" has no such dependency, and it recovers in 8.0 s. It backs off to eight
seconds between attempts and gives up in words after twelve, because a recovery
action is not free.

⚠️ **AND `advance` IS AVERAGED SINCE THE FIRST FRAME, NOT OVER THE LAST FOUR
SECONDS.** A short window reads a legitimate **0 x** every time a player catches
up to the live edge and waits for a segment that has not been written yet, which
happens several times a minute by construction. It failed a page that had just
played 60.0 s without a gap.
