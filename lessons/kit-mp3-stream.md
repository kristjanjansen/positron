# Kit lessons: mp3-stream.mjs

The long comments cut from `demo/shell/mp3-stream.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-mp3-stream.md#<anchor>`.

<a id="header"></a>

## mp3-stream.mjs, file header

demo/shell/mp3-stream.mjs — an Icecast mount as an AudioNode, with no media
element anywhere in it.

TWO CODECS. `audio/mpeg` mounts (ERR, Radio 1965) and `audio/aac` ones (IDA
Radio, and every AzuraCast station). The framing is chosen from the RESPONSE's
`content-type` and the decoder is configured from the FIRST FRAME's own
header, so neither decision is taken from the URL. CLAUDE.md has that rule
twice over: `canPlayType` answers "maybe" in two browsers that cannot both
play the thing, and an `.mp3` suffix says nothing about what a mount serves.

🔴 WHY THIS EXISTS, MEASURED RATHER THAN ASSUMED. `/archive/radio/` played its
station through `<audio>` and tapped it with `createMediaElementSource`. On an
iPhone (iOS 18.7, Safari 26.6.1) that tap is silent: across a 50-second run
the analyser read **0.0000 on every single line** while the element played
happily (`paused:false, readyState:4, no error`) and the context ran at
48 kHz — and a 440 Hz oscillator through the SAME analyser read **0.33–0.80**.
The graph can hear. WebKit does not route that element into it.

Everything downstream inherits that silence: the granulator ran perfectly, at
the right grain rate, on nothing. So the page decodes the bytes itself.

⚠️ THE BYTES WERE NEVER THE PROBLEM. The same page already fetches this mount
to measure it, and that fetch passes on the phone — `the page could read the
bytes (CORS) — 141 KiB in 5 s`. What was missing was turning them into
samples without asking a media element to do it.

── the two decode paths, and why both ──────────────────────────────────────

A. `AudioDecoder` (WebCodecs), one `EncodedAudioChunk` per frame. The
   decoder keeps state across frames, so the output is continuous and there
   is no seam anywhere. Preferred wherever it will configure.
B. `decodeAudioData` over a GROUP of frames. Available everywhere, and the
   reason it is the fallback rather than the choice: every decode starts cold,
   so each block opens with the decoder's own start-up transient and the
   blocks have to be butted together. It is a working stream with a seam
   every so often, which is better than silence.

Which one ran is REPORTED, never assumed — `stats().path`.

⚠️ NEITHER PATH RESAMPLES AND NEITHER NEEDS TO. An `AudioBuffer` carries its
own sample rate and `AudioBufferSourceNode` resamples on playback, so a
44.1 kHz mount plays correctly into a 48 kHz context for free. Doing it by
hand would be a pitch bug waiting to happen: 44100 samples fed to a 48000 Hz
clock is 8.8% sharp, which sounds like a broken instrument rather than a
broken assumption.

<a id="splitter-after-headers"></a>

## mp3-stream.mjs, createMp3Stream, splitter

⚠️ BUILT AFTER THE HEADERS, NOT BEFORE THE FETCH. Which framing to read is
the response's answer, so the splitter cannot exist until there is one.

<a id="wire"></a>

## mp3-stream.mjs, createMp3Stream, wire

🔴 WHAT THE WIRE DID, RECORDED HERE SO NOBODY OPENS A SECOND CONNECTION FOR
IT. `/archive/radio/` used to fetch the mount TWICE on every visit — once to
listen and once, for five seconds, to measure the bitrate, the arrival gaps
and the ICY headers. Two listeners per visitor on somebody else's Icecast,
for numbers this loop already had in front of it.

⚠️ AND THAT MATTERS BEYOND TIDINESS. This project has already made a public
broadcaster stop answering by treating their origin as free (`workers/shout`
`/health` fanned out to six mounts per call and three ERR streams began
refusing our Worker in 9 ms). `live.uuu.ee:8001` is a volunteer's machine.
The cheapest request is the one not made.

⚠️ `marks` IS BOUNDED. It is a growing array on an endless stream, so it
holds only the first minute — long enough for any window a caller wants to
average over, and it stops growing rather than leaking for the length of a
visit.

<a id="varispeed"></a>

## mp3-stream.mjs, createMp3Stream, rate and target

🔴 VARISPEED, AND IT IS THE TAPE KIND: PITCH FOLLOWS SPEED. We schedule the
buffers ourselves, so this is one `playbackRate` — which is only true
because the media element is gone. It could not have been done at all while
WebKit owned the playback.

⚠️ AND A LIVE STREAM CANNOT SUSTAIN IT, WHICH IS THE INTERESTING PART.
Bytes arrive at exactly 1×. Below 1× the queue GROWS without bound — you
fall behind the station and stay behind, for ever, by construction. Above
1× you consume faster than the wire delivers and run dry the moment the
cushion is spent; `underruns` is what says so. Neither is a bug to fix,
both are the price of the gesture, and the page shows both numbers rather
than hiding a limit it cannot remove.

<a id="glide-per-sec"></a>

## mp3-stream.mjs, createMp3Stream, GLIDE_PER_SEC

How fast the speed may change, as a RATIO PER SECOND rather than per block.

🔴 IT WAS 1.10 PER BLOCK AND THAT IS WHY A RATE CHANGE CRAWLED. Blocks are
a quarter-second, so 1.10 each is 1.46x a second — and 1x down to 0.125x is
a factor of eight, which took **five and a half seconds** of climbing on top
of the cushion still draining at the old speed. REPORTED as *"why rate
change is so slooooooooow"*, fixed to 4x a second, and REPORTED AGAIN as
*"can we speed change up?"*.

🔴 SO HERE IS THE WHOLE BUDGET, BECAUSE THE GLIDE IS NOW THE SMALLER HALF
AND RAISING IT FURTHER BUYS ALMOST NOTHING. A press costs:

 the cushion   `floorMs` = 600 ms of audio already scheduled at the old
               speed. A scheduled `AudioBufferSourceNode` has its rate
               curve written; the only way to shorten this is to throw the
               queue away, which an earlier version did and paid for in a
               click and a gap.
 the glide     log(factor) / log(GLIDE_PER_SEC) seconds.

At 4/s, 1x -> 0.125x was 1.5 s of glide on 0.6 s of cushion. At 16/s it is
**0.75 s**, and 1x -> 0.5x is 0.25 s. Going to 64/s would save another
0.37 s of a 1.35 s total and stop sounding like a tape coming up to speed,
which is the thing the ramp is for.

⚠️ WHAT IS LEFT IS THE CUSHION, AND IT IS SHOWN RATHER THAN SHORTENED —
`arriveAt` below, which the rate button pulses until. A wait somebody can
see the end of is a different experience from the same wait in silence.

⚠️ PER SECOND IS ALSO THE RIGHT UNIT, not a tuned number. Per block, the
speed of the gesture depended on `blockMs` — change the block size for an
unrelated reason and the control changes character with it.

<a id="arrive-at"></a>

## mp3-stream.mjs, createMp3Stream, arriveAt

🔴 WHEN THE ARMED SPEED WILL BE HEARD, WHICH IS NOT WHEN IT WAS SET. The
context time at which the first block that actually reaches the target
begins to sound. Everything between the press and this instant is the
cushion draining at the old speed — real, unavoidable and, until now,
indistinguishable from a control that did nothing.

⚠️ `0` RATHER THAN `Infinity` AT REST. Starting it at `Infinity` would say
"still settling" before a single block had been scheduled, so a page would
open with its rate button already pulsing at a speed nobody asked for.

<a id="xfade"></a>

## mp3-stream.mjs, createMp3Stream, XFADE

🔴 SIX MILLISECONDS OF CROSSFADE AT EVERY SEAM, AND IT IS NOT DECORATION.
Blocks are separate `AudioBufferSourceNode`s butted end to end, and three
things make that join discontinuous: each node resamples 44.1k into a 48k
context with its OWN interpolation phase, `playbackRate` is ramping across
the block, and the catch-up correction changes it per block. REPORTED as
"0.5 has real clicks in sound" — and MEASURED with `underruns: 0` through
the whole run, which is what rules out starvation and leaves the seam.

⚠️ A FADE WITHOUT AN OVERLAP WOULD BE WORSE. Fading each block in and out
in place guarantees continuity and digs an amplitude notch at every join —
four per second, heard as flutter. Overlapping means 6 ms where two
consecutive pieces sound together, which is a smear nobody can hear rather
than a click everybody can.

<a id="max-ahead"></a>

## mp3-stream.mjs, createMp3Stream, MAX_AHEAD

How far ahead the queue may run before arriving audio is DROPPED.
At 0.125x the queue grows about seven seconds per second, so without a
ceiling this schedules unbounded nodes and holds unbounded memory. Thirty
seconds is a generous window of slowed radio; past it the stream has to
give something up, and it says so.

<a id="cushion"></a>

## mp3-stream.mjs, schedule, the cushion

🔴 THE CUSHION, AND RUNNING DRY IS A COUNTER RATHER THAN A GUESS.
If the queue has fallen behind the clock there is nothing to do but
restart ahead of it — but that is a DROPOUT, and this repo has already
paid for a playout that trimmed audio silently (`pcm-playout`, LESSONS
#52: bit-clean and still broken, because every stage that can discard
data needs a counter a page actually displays).

<a id="recovery-cushion"></a>

## mp3-stream.mjs, schedule, recovery

🔴 A SMALL CUSHION ON RECOVERY, NOT THE STARTING ONE. This restarted at
`floorMs` (600 ms), so every late block tore a 600 ms hole in the sound
— and this page feeds the audio to a granulator whose ring RECORDS the
hole, which then gets granulated. Reported as "audio has holes,
granulator seems to operate on holes too". The opening cushion is for
building a queue from nothing; recovery just needs to be ahead of the
clock. ⚠️ The hole is not removed, only shortened — it is counted, and
`underruns` is the number to watch.

<a id="startup-burst"></a>

## mp3-stream.mjs, schedule, start-up burst

🔴 A LIVE STREAM MUST NOT ACCUMULATE LATENCY, AND THE BURST MAKES IT.
Icecast hands a new listener several seconds faster than realtime to prime
their buffer — MEASURED here at **4.55 s queued** after six seconds of
listening, and that never comes back on its own: from then on you are
four and a half seconds behind a live radio station for ever. Past the
ceiling the OLDEST audio is dropped and the clock moves up.

⚠️ IT IS COUNTED, because a stage that silently discards audio is exactly
the defect LESSONS #52 is about — a stream that measured bit-clean while
`pcm-playout` trimmed 15 ms mid-note, with no counter any page displayed.
🔴 THE BURST IS TRIMMED DURING A START-UP WINDOW, NOT "BEFORE THE FIRST
BLOCK". Restricting it to `!st.blocks` looked right and never fired:
Icecast's several seconds arrive in the second AFTER the first block is
scheduled, so the cap was always asked too early. MEASURED: `buffered`
sat at **4.5 s for the whole run**, with `skipped: 0` — permanently that
far behind the station, and every speed change inaudible until 4.5 s of
already-scheduled audio had played out.

⚠️ Trimming LATER is what tears holes mid-listen, so the window is short
and closes for good. Inside it nobody is listening yet; outside it the
drift correction below does the work without dropping anything.

<a id="trim-by-dropping"></a>

## mp3-stream.mjs, schedule, trim by dropping

🔴 TRIM BY DROPPING WHAT ARRIVES, NEVER BY MOVING `nextAt` BACKWARDS.
This used to say `nextAt = now + floorMs/1000`, which is a REWIND of
nearly two seconds into audio that is already scheduled and already
sounding — so the burst played ON TOP OF ITSELF. MEASURED by recording
every `AudioBufferSourceNode` the page starts: **63 overlaps in the first
5.4 s**, with 27.95 s of audio crammed into a 21 s span, and `underruns:
0` throughout — which is what rules out starvation and leaves this.
REPORTED as a *"broken blurb"* at the start, and that is exactly what
several copies of the same second sounding together is.

⚠️ AND THE COMMENT ABOVE HAD BEEN RIGHT ALL ALONG: it says the oldest
audio is dropped and the clock moves up. Nothing was dropped and the
clock moved DOWN. Dropping is the version that works — the queue drains
against the wall clock at one second per second, the already-scheduled
cushion plays out continuously underneath, and what is lost is a slice of
the station's past, which is the direction a live stream wants to go.

🔴 THE SAME MACHINERY BOUNDS SLOW PLAYBACK, AND THAT IS WHY 0.25x USED TO
SOUND SPED UP. Below 1x the queue grows for ever by construction — bytes
arrive at exactly 1x — so something has to give at the far end. It used to
drop ONE buffer whenever the queue touched 30 s, which pins it there and
makes a forward jump in the content every few hundred milliseconds: a
stutter that reads as the station being fast, on a page playing it slow.
REPORTED in exactly those words.

Now it drains to the floor in one go. You drift away from the station for
as long as the ceiling allows, hear every slowed second of it, and then
there is ONE cut back to live, once, with a line in the log saying so.

<a id="ramp"></a>

## mp3-stream.mjs, schedule, rate ramp

🔴 THE SPEED CLIMBS, IT DOES NOT JUMP — and the arithmetic for it is
exact rather than approximate. Step this block's end rate a fixed RATIO
toward the target (a constant ratio is what reads as a smooth climb; a
constant increment crawls at the bottom and leaps at the top), then ramp
`playbackRate` linearly across the block.

⚠️ A RAMPING RATE BREAKS `duration / rate`, WHICH IS WHY THIS IS WORTH
WRITING DOWN. The wall time T to consume D seconds of media while the
rate goes linearly from r0 to r1 satisfies ∫rate dt = D, so
T·(r0+r1)/2 = D and **T = 2D/(r0+r1)**. That is exact, not a small-change
approximation — get it wrong and the queue drifts against the clock and
starts tearing the holes this file already has a section about.
🔴 AND A STANDING QUEUE IS CORRECTED BY PLAYING FRACTIONALLY FASTER,
NEVER BY DROPPING. Once the start-up window has closed, any excess
latency is drained with a speed correction of at most 2% — far under the
~6% where a pitch change becomes noticeable, and it costs no audio at all.
This is what every streaming player does and it is strictly better than a
hole: the listener loses nothing, they just catch up.

<a id="arrived"></a>

## mp3-stream.mjs, schedule, arrival

The glide is over the moment the clamp stops biting — `r1 === want` is
exact rather than a tolerance, which matters because `want` carries the
catch-up correction and so is never quite `target`. This block's `nextAt`
is when that speed starts to sound.

<a id="report-asked"></a>

## mp3-stream.mjs, schedule, st.rate

⚠️ REPORT WHAT WAS ASKED FOR, NOT THE CORRECTION. `rate` carries a
fraction of a percent of catch-up that nobody chose and nobody can hear;
printing it as the speed would make a control that reads 1.004 when the
listener pressed 1.

<a id="started-at"></a>

## mp3-stream.mjs, schedule, startedAt

⚠️ THE FIRST BLOCK'S START, NOT ITS END. `startedAt` is read as "when did
sound begin" — `playedNow()` on the page subtracts it from the clock to
say how long you have been listening — and taking it after the advance
below put it a block into the future, so HEARD ran a quarter of a second
short and the start-up window closed a quarter of a second late.

<a id="advance-new-media"></a>

## mp3-stream.mjs, schedule, nextAt advance

🔴 THE CLOCK ADVANCES BY THE NEW MEDIA ONLY, WHICH IS THE WHOLE POINT OF
REPEATING THE TAIL. `nextAt += T - xf` against blocks that did NOT repeat
anything spent six milliseconds of the station per block on the seam — at
four blocks a second that is playback running **2.4 % fast**, for ever.
MEASURED: the cushion drained 600 ms -> 90 ms across a twenty-second
listen, then underran, then drained again — **nine holes of 65-76 ms, one
every 1.2 s**, which is the "hole 1-2 sec later" that was reported, and
which no amount of catch-up correction could fix because the correction
caps at 2 % and the leak was bigger than the cap. The queue was being
eaten by the thing meant to smooth it.

<a id="flush"></a>

## mp3-stream.mjs, flush

Turn accumulated per-channel PCM into a block, at the STREAM's rate.

🔴 EACH BLOCK OPENS WITH A COPY OF THE LAST ONE'S ENDING, so the six
milliseconds where two blocks sound together contain THE SAME AUDIO twice
rather than two different moments of the station. That is what makes the
crossfade free: an equal-power-ish linear fade between identical material
reconstructs it, and the stream's clock advances by the new samples alone.

⚠️ THE OLD VERSION OVERLAPPED DIFFERENT MATERIAL AND PAID FOR IT IN TIME.
It started each block six milliseconds before the previous one ended and
never gave those milliseconds back, which is a 2.4 % leak in the cushion —
see the note beside `nextAt` in `schedule`. A smear nobody can hear is
still a smear that has to come from somewhere.

<a id="webcodecs-no-description"></a>

## mp3-stream.mjs, tryWebCodecs

── path A: WebCodecs ─────────────────────────────────────────────────────
🔴 NO `description`, AND FOR AAC THAT IS THE WHOLE CONFIGURATION.
WebCodecs reads an AAC bitstream one of two ways: with a `description` (an
AudioSpecificConfig) the chunks must be bare AAC, and WITHOUT one they must
be ADTS-framed. This file hands over whole ADTS frames, headers included, so
the absent field is the thing that makes it work rather than an omission.
MEASURED in Chrome: `mp4a.40.2` at 44100/2 configures, and 1024-sample
frames come back out of it.

<a id="decode-group"></a>

## mp3-stream.mjs, path B, decodeGroup

── path B: decodeAudioData over a group of frames ────────────────────────
⚠️ IT MUST START ON A SYNC. `decodeAudioData` refuses — or worse, silently
mis-decodes — a buffer that begins part-way through a frame, which is
exactly what an Icecast listener's first read is. The splitter guarantees
whole frames, and a run of whole frames is a valid tiny file in BOTH
framings: MPEG audio and ADTS are each just their frames, back to back,
with no container around them.

<a id="framing"></a>

## mp3-stream.mjs, start, framing

🔴 THE FRAMING COMES OFF THE RESPONSE. `audio/mpeg` is Layer III,
`audio/aac` is ADTS, and they share a sync word, so a scanner pointed at
the wrong one finds NOTHING rather than finding rubbish — MEASURED, the
Layer III scanner over a megabyte of a real AAC mount returns 0 frames.
That is the worst shape available: bytes arriving, no errors, no sound.

⚠️ A `content-type` NEITHER NAME MATCHES IS NOT A REASON TO GUESS. `null`
here puts the splitter on its own sniff, which latches whichever reader
finds CONFIRMED frames in the arriving bytes.

<a id="on-audio"></a>

## mp3-stream.mjs, start, onAudio

🔴 THE AUDIO COMES OUT OF `onAudio`, AND IT DID NOT EXIST UNTIL THIS FILE
NEEDED IT. `icyDemuxer` returns void: both earlier callers wanted only the
station's text and let an `<audio>` element fetch the stream a SECOND time
for the sound, so the audio bytes were demuxed and dropped. MEASURED here
before it was added — 473,293 bytes read, the title decoded correctly, and
`frames: 0`, because `eat()` handed nothing back to decode.

<a id="metadata-first"></a>

## mp3-stream.mjs, start, metadata first

⚠️ THE METADATA COMES OUT FIRST. `icy.mjs` splices 16-byte-aligned text
blocks INTO the audio, so feeding raw bytes to the frame splitter would
hand the decoder a title as if it were audio — a click every few
seconds, on a stream that is otherwise perfect.

<a id="rate-rounded"></a>

## mp3-stream.mjs, start, bitrate log

⚠️ THE RATE IS ROUNDED BECAUSE ONE OF THE TWO CODECS HAS NO SUCH
FIELD. MPEG audio writes its bitrate in every header; AAC does not,
so this is the first frame's own length turned back into a rate and
it wobbles frame to frame. A number carried to three decimals would
claim a precision the format does not have.

<a id="set-rate"></a>

## mp3-stream.mjs, setRate

0.25 .. 2, and it takes effect AT ONCE.

🔴 SETTING THE RATE ALONE MADE THE CHANGE ARRIVE MINUTES LATER. A new rate
only applies to blocks scheduled AFTER it, and there is always a queue —
worse, at 0.25x every queued block takes four times as long to play, so
the backlog ahead of the change stretches with it. Reported as "changing
speeds taking forever", and it was: seconds of already-scheduled audio had
to drain at the OLD speed first, and at a slow rate that drain got slower.

So the queue is thrown away and rebuilt. ⚠️ That is a deliberate
discontinuity — a click, and a small gap while the cushion refills — which
is the honest cost of a control that responds. A rate change the listener
cannot hear for ten seconds is not a control.
Ask for a speed. The stream CLIMBS to it over about a second.

🔴 AN EARLIER VERSION SET THE RATE AND WAITED, AND THE CHANGE ARRIVED
MINUTES LATER. A new rate only applies to blocks scheduled after it, and
at 0.25x every queued block takes four times as long to drain — so the
backlog ahead of the change stretched with it. Reported as "changing
speeds taking forever", and it was.

The fix after that threw the queue away, which worked and cost a click and
a gap. This one needs neither: the ramp is applied per block as the queue
is BUILT, so the only delay is the cushion — about half a second — and
what you hear is a tape coming up to speed rather than a cut.

<a id="rate-floor"></a>

## mp3-stream.mjs, setRate, clamp

⚠️ THE FLOOR WAS 0.1 AND IT SILENTLY ATE 0.0625. A clamp a caller cannot
see turns a rate button into one that plays at a different speed from
the one written on it — the two slowest options would have sounded
nearly identical, which reads as a broken control rather than a clamp.

<a id="rearm"></a>

## mp3-stream.mjs, setRate, rearm

⚠️ ONLY ON A REAL CHANGE. `setRate` is called from a poll and from the
bar's own handler, so re-arming the arrival on every call would keep a
page permanently "settling" at a speed it reached a minute ago.

<a id="settling"></a>

## mp3-stream.mjs, stats, settling

Is the armed speed audible yet? See `arriveAt`. `arriveIn` is null
while the glide is still running, because the answer is not known until
the block that reaches the target has been scheduled — and a made-up
countdown is worse than none.

<a id="wire-stats"></a>

## mp3-stream.mjs, wire()

What the connection itself did — status, ICY headers, arrival gaps, and
the byte marks a caller needs to work out a rate over any window.

🔴 THE RATE IS NOT COMPUTED HERE ON PURPOSE. A mean over "so far" is the
BURST, not the stream: Icecast hands a new listener ~64 KiB faster than
realtime, so an early reading of a 128 kbps mount lands comfortably in the
180s — MEASURED at 185 on this mount, and `shout` reads 195 over seven
seconds for the identical reason. Which window is the honest one is the
caller's question, so this hands over the marks and lets them answer it.
