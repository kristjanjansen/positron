# plan: make `/stage/`'s LL-HLS leg record, 2026-09-25

Asked: *"add hls recording. can you do it? plan first in bg"*.

🔴 **NOTHING HERE IS MEASURED AGAINST A RUNNING `/stage/`.** No press, no
`node demo/verify.mjs stage`, no browser. It is read out of the source plus one
HEAD on the manifest. Every claim below says which it is.

## 1. Two things block it, not one

**(a) There is no track to record.** `startShow()` ends with
`live.sub.inbound.getVideoTracks()[0]` into `startRecorder(track)`, which builds
`new MediaStream([track])` and a `MediaRecorder`. `startHls()` has no
`MediaStreamTrack` anywhere in it: element, `armVideo`, `showPictureOn`,
`createLowLatencyPlayer`, badge, first frame.

**(b) 🔴 AND THE ONE NOBODY NAMED: `startHls` NEVER SETS `phase`.** MEASURED:
`phase = 'live'` has exactly ONE assignment in the file and it is inside
`startShow`. `stopShow()` opens `if (phase !== 'live') return;`. **So on the HLS
leg the whole archive pipeline is unreachable even with a recorder**: no
`rec.stop()`, no blob, no `openArchive`, no `resolveDuration`, no
`paintPlayRec()`, and `Play recording` stays disabled because
`paintPlayRec` is `playRecBtn.disabled = !archiveMedia` and `archiveMedia` is
only set inside `openArchive`. The recorder is the cheaper half.

## 2. The routes

### Route 1, `video.captureStream()` on the HLS element. RECOMMENDED, MSE only.

🔴 **NO PRECEDENT IN THIS REPOSITORY. MEASURED BY GREP: nine `captureStream`
call sites and every one is `canvas.captureStream`.** `video.captureStream`,
`webkitCaptureStream` and `mozCaptureStream` appear nowhere. So availability is
a reading of the platform, not a measurement of this machine.

READ, not measured: Chrome and Firefox have it, Firefox behind
`mozCaptureStream`; WebKit has none on a media element, so Safari and iOS
cannot. Three one-liners settle it and cost nothing:
`typeof document.createElement('video').captureStream` in headless Chrome, in
`demo/verify-safari.mjs` and in `demo/verify-native.mjs`.

🔴 **THE LEVEL SWITCH IS THE REAL RISK AND IT IS NOT HYPOTHETICAL.** MEASURED
2026-09-25 on the live page: the element went **1280x720 then 854x480 mid-play**.
What that does to a captured track and the WebM around it is unmeasured
everywhere here. The plausible failure is not a throw: the encoder reconfigures,
the WebM header keeps the PixelWidth it was written with, and the file plays the
first part and mangles the rest. `resolveDuration` seeks to 1e6 to make a
recorder file admit a duration, and a file whose later clusters disagree with its
header is exactly the shape that returns `null` there. **Silent from above: the
recorder said `recording`, the blob has bytes, the archive is empty.**

⚠️ AND A REBUILD IS A SHARPER VERSION OF IT. `src/low-latency-player.js`'s
`rebuild(why)` destroys and re-boots, and `boot()` ends `hls.attachMedia(video)`,
which assigns a NEW MediaSource URL. INFERRED: a captured track is tied to the
element's current media resource and ends there, leaving a recorder that reports
`recording` with nothing arriving. The hook exists: the player emits `rebuild`
and `hlsPlayer.rebuilds` is a getter.

### Route 2, `canvas.captureStream()` with a draw loop. REJECTED as default, KEPT named.

Costs a draw per frame and a SECOND ENCODE of a picture that already decodes
once. No second decode, no second delivery.
✅ Its one real advantage: **immune to the level switch by construction**, since
a fixed-size canvas absorbs a resolution change. If the measurement in §5 shows
route 1 breaking across a switch, this is the fix, chosen ON that measurement.
⚠️ And a canvas mirror was already tried on this page today for an unrelated
reason and was wrong. Two canvases in one day for two reasons is how a page ends
up with machinery nobody can explain.
🔴 It does NOT rescue Safari, which is what people will assume it does.

### Route 3, tainting. ALREADY ANSWERED IN THIS REPOSITORY, TWICE.

**The MSE path is NOT tainted, structurally.** `low-latency-player.js`'s
`freezeFrame()` says it verbatim: *"MSE-fed video does not taint the canvas
(hls.js fetches media via CORS), so this is safe on the hls.js path; a tainted
canvas (native src fallback) just skips."* The mechanism generalises: **the taint
question is decided by who fetched the bytes.** hls.js fetches with XHR, which
only succeeds under CORS, so by the time anything reaches a SourceBuffer the page
holds those bytes; the element's resource is then a same-origin `blob:`.

**The NATIVE path IS tainted.** `preferNative: 'auto'` plus `ManagedMediaSource`
gives a real HLS element on WebKit loading a cross-origin manifest, and
`grep -n crossOrigin src/low-latency-player.js` returns NOTHING.

✅ MEASURED, one HEAD, no delivery, no container woken: the LL-HLS manifest
answers **204** with **`access-control-allow-origin: *`** and `vary: origin`.
204 because nothing is publishing, which is the idle answer. The SEGMENTS were
not measured and could not be: at 204 there are none.

🔴 **REFUSED: setting `crossOrigin = 'anonymous'` on the native path.** A
CORS-mode media load FAILS where a plain one merely taints, so one child playlist
without ACAO turns a playable stream unplayable on the half of the audience this
project cares most about. It buys nothing while WebKit has no media-element
capture.

🔴 **AND THE FINDING THAT CHANGES THE COST: `readBurnedFrom` IS ALREADY INERT ON
`/stage/`, FOR BOTH LEGS.** `workers/pub/container/server.mjs` says it in its own
comment: the 56-block machine-readable row *"used to be drawn here too. NOTHING
EVER READ IT"*, and it cost a measured +16 per cent encoder CPU. `drawFilters()`
returns a hue rotation and four `drawtext` calls and no row. So the taint risk
costs `/stage/` no check it currently has.

### Route 4, audio. PASS THE VIDEO TRACK ONLY.

🔴 The HLS leg DOES carry audio (`-c:a aac -b:a 128k` off lavfi `CHORD`), so
`captureStream()` on Chrome hands back an audio track AND a video track where
WHEP hands back one video track.
✅ Drop the audio, for three reasons in order: the source's audio is a test tone
and not the show's sound, so recording it adds tone to an archive people watch;
the two legs' archives stay comparable, which is why the page has two legs; and
`AUDIO_BPS` stays honestly unused, which `BACKLOG.md` argues for at length.
⚠️ So `recorderMime` and `VIDEO_BPS` do not change and the existing bitrate
assert keeps working.
⚠️ When a real show carries real sound: pass both tracks, `AUDIO_BPS` starts
applying, one new assert is owed, and the mute glyph's *"the audience gets the
picture and no sound"* changes IN THE SAME COMMIT.
⚠️ UNMEASURED: whether a `muted` element yields a live audio track. Irrelevant
under this recommendation, load-bearing the day audio is passed.

## 3. What the archive needs: NOTHING NEW

The pipeline is already general and gated on a `phase` the HLS leg never reaches.
In order: await `rec.onstop` after `rec.stop()`; stop the captured track THEN
destroy the player (the other order ends the capture under the recorder);
`setBadges('offline')`; blob from `chunks` with `chunks[0].type`; object URL;
under `?r2=1` only, `putWhole`, `proveReadable`, `fetchBack`; then
`openArchive(src, mime)`, which does `armVideo`, appends,
`recordedMs = await resolveDuration(v)` and bails in words on null,
`archiveDeck.setRange`, `relane()`, `followPlayhead()`, `mediaMaster`,
`archiveMedia = v`, `paintPlayRec()`; then `sayState()`.

**`Play recording` needs exactly one thing: `archiveMedia` truthy.** No change.

🔴 **ONE COLLISION THAT DOES NOT EXIST ON THE WebRTC LEG.** `archive` is
`byId.get('controlroom')`: since the Archive tab went, the archive panel IS the
control room panel. `startShow` appends the live element to the AUDIENCE, so
there is no clash today. `startHls` calls `showPictureOn(showingTab())`, usually
the control room, and then `openArchive` empties that same stage. MEASURED:
`audVideo` has five references and **no assignment back to null anywhere**. So
`openArchive` removes the live element while `audVideo` still points at it, a
later tab change re-appends the dead element over the recording, and
`Play recording` plays an element nobody can see.
**Fix, two lines: null `audVideo` on stop, and make `showPictureOn` refuse while
`archiveMedia` is set.**

## 4. One shared path, and only the tail of it

Extract only the overlap: get a track, start the recorder, follow the write head,
set `phase`, say state.

```js
async function beginRecording(getTrack) {
  const got = await getTrack();            // { track, source, why }
  if (!got.track) { recSource = 'none'; d.log(got.why, 'warn'); return null; }
  rec = startRecorder(got.track);          // UNCHANGED, one video track
  recTrack = got.track; recSource = got.source;
  followWriteHead(); phase = 'live'; sayState();
  return rec;
}
```

⚠️ **KEEP THE `throw` ON THE WebRTC LEG.** Today a missing WHEP track throws and
the catch logs *"the show did not start"*. Routing it through `beginRecording`
would leave a live picture and no recording, and the existing assert *"the
recording is the track the page says it is"* would change meaning silently.

🔴 **AND `toggleTransport` MUST STOP A RUNNING LEG BEFORE STARTING THE OTHER, OR
THIS BREAKS THE WebRTC LEG SILENTLY.** `startShow` opens
`if (phase === 'live' || starting) return;`. **The moment HLS sets
`phase = 'live'`, pressing `Start WebRTC` relabels the buttons, drops the HLS
player and returns immediately. No show, no error, no log line**, and the
fourteen asserts downstream of a running show go red about a page whose real
fault is one guard. This is why it is step 1.

⚠️ `startHls` must `await waitForFirstFrame` rather than `.then` it, at **12 s
not 20 s**, matching `startShow`: the inner wait is the shorter one and the
drill's outer poll covers a cold container.

## 5. The harness, and the money finding

🔴 **EVERY FULL SUITE RUN ALREADY STARTS AN LL-HLS LEG AND HOLDS IT ABOUT 75
SECONDS, UNMEASURED.** MEASURED: `demo/verify.mjs` presses
`'.pos-controls button, .tbar-x'` in document order and applies `settleMs` to
**control 0 only**; `/stage/` has no controls row, so control 0 is `Start HLS`;
`manifest.mjs` gives `stage` `settleMs: 75000`. Then the next press switches
transport and `dropTransport()` throws the leg away.

✅ **SO GRADING IT ADDS NO DELIVERY. It converts 75 seconds that are already paid
and unmeasured into 75 seconds that are paid and graded.** That is arithmetic.

Eight asserts, one block, both capability modes so the count cannot vary:

1. the HLS leg says which engine is playing it (`engineReport()`), catching the
   618 KB script not arriving and the native branch being taken headless
2. the recording is the element the page is playing, by OBJECT IDENTITY, with
   `recSource === 'captured'`
3. the recorder produced data while the leg was carrying, after 3.5 s
4. the captured track is still live, with `levelSwitches` and `rebuilds` in the
   detail. ⚠️ A green with `levelSwitches: 0` PROVES NOTHING and the detail must
   say so loudly
5. the recording has a duration that could be resolved. **This is the one that
   catches the level-switch corruption, because that is how it presents**
6. the recording is not a black rectangle: eight-point spread, not a level
7. `Play recording` disabled before the stop and enabled after
8. **where a browser cannot capture, the page SAYS SO and records nothing.**
   This makes the refusal gradeable, so `verify-safari.mjs` and
   `verify-native.mjs` grade the Safari answer rather than passing quietly

**Cost: about 6 to 9 s inside `checks()`, and that is the real risk.** This page
HOLDS its asserts and flushes on return, and the cliff is measured in
`BACKLOG.md`: past about 28 s the flush misses the harness's patience and the
page reports **2 asserts instead of 37 while the suite prints a confident
green**.
✅ Mitigation: **press nothing.** Control 0 has already started the leg and held
it 75 s. Grade the leg that is already running, record 3.5 s, stop it through
`toggleTransport('hls')`, grade the archive, then run the WebRTC drill.
🔴 **The number to read after is the COUNT.** Today 46/48 with 38 page asserts.
Expected 46 page asserts. **Below 38 means the flush truncated and the run is
telling you nothing.** Adding asserts moves no control index; adding a button
would, and this plan adds none.

## 6. Order

0. **Measure first, none of it on `/stage/`.**
   - a. `typeof document.createElement('video').captureStream` in headless
     Chrome, `verify-safari.mjs`, `verify-native.mjs`. Three one-liners.
   - b. 🔴 **THE KEY ONE, AND IT BELONGS ON `/llhls/`**, which already holds the
     same input, already pays that delivery, reads 12/12 and has no archive to
     disturb. Attach a `MediaRecorder` for 30 to 60 s and read four things: does
     a track appear; does `readyState` stay `live`; how many `levelSwitches`;
     what does `resolveDuration` say about the blob. **One run chooses route 1
     or route 2.**
   - c. If it sees zero switches, force one with `hls.currentLevel`. A
     measurement that never met the case is not a measurement of the case.
1. `toggleTransport` stops a running leg first. Verify alone.
2. Extract `beginRecording`, rewire WebRTC, keep the throw. **Re-run and confirm
   38 page asserts unchanged.** A refactor that moves the count is not one.
3. `captureFromElement`, await the first frame, `phase` through
   `beginRecording`, `recSource` gains `'captured' | 'none'`. Teach `stopShow`.
4. The `audVideo` collision from §3.
5. Re-capture on `rebuild`, ONLY if 0b shows the track dying there. A guard for
   a failure that does not happen is a dead guard, and this page shipped one.
6. The eight asserts, and diff the count.
7. The words, same commit. `one` and `what` need no change; the mute glyph's
   sentence does if audio is ever passed.
8. Build, deploy, quote the stamp, and hand over the check as a URL: press
   `Start HLS` on https://positron.studio/stage/, wait for `ON AIR`, press
   `Stop HLS`, and `Play recording` should go from grey to pressable.

## 7. Money

No second delivery, no second decode, no second live input. Route 2 would add a
second ENCODE. A second `<video>` on the same source would be a second delivery
and is refused for the reason the control room mirror already states.
⚠️ **The owed cost gate is neither paid nor discharged.** This makes the HLS half
measured, which is a prerequisite for pricing that gate rather than guessing.

## 8. Silent failures, and what catches each

| the silent failure | how it reads from above | caught by |
| --- | --- | --- |
| no duration (level switch breaks header agreement) | recorder said recording, blob has bytes, archive empty | 5, with 7 separating it from the pipeline never running |
| captured track is black | chunks arrive, duration resolves, picture is a rectangle | 6 |
| track dies at a rebuild | `recording` for ever, chunks stop, nobody told | 4 |
| track dies at a level switch | same, invisible from the recorder | 4, with the zero-switch caveat |
| Safari plays and records nothing | identical to a working page | 8 |
| `phase = 'live'` on HLS makes `startShow` return early | buttons relabel, no show, no error | step 1 first |
| dead live element re-parented over the archive | `Play recording` plays an invisible element | step 4 |
| the flush misses the harness's patience | **2 asserts of 46 and a green suite** | the assert COUNT. Nothing else sees it |

## 9. Unsettled, and what settles it

1. Does `video.captureStream` exist in the browsers this project runs. Three
   one-liners.
2. **What a level switch does to a captured track and the WebM.** One `/llhls/`
   run. **Nothing in this plan is worth much until this is answered.**
3. Whether a captured track survives an hls.js rebuild. Same run.
4. Whether a muted element yields a live audio track.
5. Whether Cloudflare's segments carry ACAO. Only matters if somebody revisits
   `crossOrigin`, which is refused above.
6. Whether eight asserts fit the flush budget. Only a real run answers it, and
   the number to read is the count.
