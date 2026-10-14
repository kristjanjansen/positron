# Page comments: video

The full comments cut from the code under demo/ for video, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="video-1"></a>
## video-1: demo/video/camera/index.html, style, line 16

````css
  /* The picture is asked for at half the content width on a desk, at the left
     (asked 2026-10-10, *"use 1/2 videoframe"*), and takes the full width on a
     phone, where half would be a thumbnail. */
````

<a id="video-2"></a>
## video-2: demo/video/camera/index.html, inline script, line 33

````js
  // The local camera half of /cam/, as a patchbay: the camera is a node with a
  // video-out, the picture on this page is a node with a video-in, and the
  // picture shows the camera only while the bay holds that link.
  //
  // NOTHING OPENS ON A VISIT, and nothing ever leaves this machine. The camera
  // is asked for on the start press, so the permission prompt comes after it;
  // stop ends every track. No WHIP, no relay, no Stream.
````

<a id="video-3"></a>
## video-3: demo/video/camera/index.html, inline script, line 92

````js
  // The name at the left, the resolution at the right beside the panel's own
  // full-screen button (asked 2026-10-10, *"no wrapping for footer. is id
  // needed? move rest to right ... add fullscreenbutton"*).
````

<a id="video-4"></a>
## video-4: demo/video/camera/index.html, inline script, line 99

````js
  // The picture follows the link, as /radio/blend/'s sound does: without
  // camera -> picture held the panel shows nothing.
  // An empty picture is the page's own ground, the dither's dark, not black
  // (asked 2026-10-10, *"keep same bg color initially"*).
````

<a id="video-5"></a>
## video-5: demo/video/llhls/index.html, inline script, line 32

````js
  // /video/camera/ with an LL-HLS round trip through Cloudflare beside
  // it. The camera, with a clock burned into it, feeds two pictures: the
  // original as it leaves the page, and an LL-HLS loopback, camera ->
  // pub.positron.studio/loop (the /stage/ and /cam/ publisher, a container
  // rewrapping the browser's own H.264 to RTMPS) -> a Stream input of its own
  // -> back as LL-HLS through the player /llhls/ uses. The returned picture
  // carries the clock row, so its footer reads the glass to glass delay off
  // the frames actually shown. The publish goes through the worker, so no
  // input key reaches this page. Split out of /video/webrtc/ on
  // 2026-10-12 (*"Split hls and webrtc loopbacks"*); what the two share is
  // /video/loopback.mjs.
  //
  // WHY 060 AND NOT 040: /archive/ labels the archived TV page `video 040`, so
  // a new page at 040 would carry a number a visitor has already seen on
  // something else, and /concepts/video/040/ would silently become a
  // different page (positron-concepts: no forwarding from an old address, and
  // no reusing one). 050 is MoQ loopback; 060 is the next free number.
  //
  // 🔴 EACH PRESS IS REAL CLOUDFLARE STREAM MINUTES, AND THE CAP IS 30 SECONDS
  // FROM WHEN STREAM SAYS THE INPUT IS LIVE. Billed by the minute delivered
  // whatever the protocol (positron-streaming). Asked for: "limit to 10 sec.
  // just fade out", then "limit to 20sec. fade out sloowly", then (2026-10-12)
  // the cap counted from Stream's live rather than from the first leg, so the
  // LL-HLS delay has time to settle, and "extend to 30s". Thirty seconds after
  // that both pictures have faded to the ground over their last three and the
  // page stops itself exactly as a stop press does.
  //
  // 🔴 THE TAKE IS A STREAM RECORDING, AND THE WORKER DELETES IT. RTMPS cannot
  // have recording turned off, so every take is a video counted against the
  // account's 1000 storage minutes. The loopback has an input of its own
  // ("positron-hls-loopback", src/provision-loop.sh), and positron-pub deletes
  // a take about 90 s after it ends however it ended (this page's stop, a
  // closed tab, its own cap of 50 s of RTMPS), sweeps the input every 10
  // minutes, and refuses a take when the account is at or over 600 minutes
  // (workers/pub/loop.mjs). Nothing here has to stay open for any of it. The
  // footer counts what is on that input (`rec`) and the account's storage
  // minutes (in the hover), read from /loop/status after a press. A second
  // take on the input while one runs is refused, and that is said in words.
  //
  // NOTHING OPENS ON A VISIT. The camera, the publish, the play and the status
  // read are all made on the start press.
````

<a id="video-6"></a>
## video-6: demo/video/llhls/index.html, inline script, line 88

````js
  // 30 s a press from Stream's live, the last 3 of them a fade (asked
  // 2026-10-10, *"fade out bit faster, both videopanels"*; 2026-10-12, *"extend
  // to 30s (all 20s limits)"*). BACKSTOP_MS arms the cap anyway if Stream has
  // not started it by then (a publisher that never opens, say).
````

<a id="video-7"></a>
## video-7: demo/video/llhls/index.html, inline script, line 94

````js
  // No readout: every number is in the footer of the picture it is about
  // (asked 2026-10-12, *"move readout data to videpanel footers"*).
````

<a id="video-8"></a>
## video-8: demo/video/llhls/index.html, inline script, line 140

````js
  // The footer carries what is on the loopback input (`rec`, the recordings
  // Stream holds for it, from /loop/status), which is the number the worker's
  // delete takes back to 0. The account's storage minutes and the picture
  // size are in the row's hover: MEASURED 2026-10-12, a fifth cell made the
  // row 334 px wide at 1280 scroll its last cell out of sight.
````

<a id="video-9"></a>
## video-9: demo/video/llhls/index.html, inline script, line 156

````js
  // The picture says LL-HLS on its tag plate, always, even stopped (reported
  // 2026-10-12 of the WebRTC one: *"not clear that this is webrtc"*).
  // The protocol's name is the footer's first word, not a plate over the picture
  // (asked 2026-10-13: *"rm labels on top of videos in loopback demos. move them
  // to videopanel fooers"*).
````

<a id="video-10"></a>
## video-10: demo/video/llhls/index.html, inline script, line 206

````js
  // ── the LL-HLS round trip ───────────────────────────────────────────────
  // The burned frame recorded with MediaRecorder (H.264 in WebM, 2 s
  // keyframes), sent over the worker's socket, rewrapped to RTMPS by the
  // publisher container with no encode, and played back from Stream with the
  // low latency player (camPublish in live.mjs, plans/plan-cam-llhls.md).
````

<a id="video-11"></a>
## video-11: demo/video/loopback.mjs, module, line 1

````js
// demo/video/loopback.mjs: what the two loopback pages share, the
// WebRTC one (/video/webrtc/) and the LL-HLS one (/video/llhls/).
// Split 2026-10-12, *"Split hls and webrtc loopbacks"*: each page holds one
// round trip and its own patchbay, and this module holds what is the same on
// both, so it is written once:
//
//   - the camera, with the clock row burned over it, as the frame that leaves
//     the page (`createLoopCamera`), its start button, its camera picker, and
//     the original's picture panel with the camera's name and size;
//   - a picture panel drawn from a video element, faded over the ground as a
//     press runs out (`createPicture`);
//   - the delay read off the burned clock of each presented frame (`meter`),
//     and the warmup count in a footer (`warm`).
//
// A page owns its leg, its cap, its bay and its footers' other cells.
//
// NOTHING OPENS ON A VISIT. The camera, and whatever a page then does with it,
// are made on the start press; building any of this opens nothing.
````

<a id="video-12"></a>
## video-12: demo/video/loopback.mjs, module, line 36

````js
/**
 * Glass to glass off the burned clock, per PRESENTED frame, as /cam/ does:
 * this one page stamps the row and reads it, so one clock is on both ends
 * and the difference is exact. A frame whose row does not read (its checksum
 * fails, which a scaled or mid-ramp frame can) is skipped, never guessed.
 */
````

<a id="video-13"></a>
## video-13: demo/video/loopback.mjs, module, line 62

````js
/**
 * Warmup, per leg: from the press to the first frame back whose burned clock
 * reads. While it runs the cell counts whole seconds and the word at the left
 * says `warming up`; then the cell holds the measured time, to a tenth, and
 * the word clears, because the numbers beside it already say so (2026-10-12,
 * *"cound time for warmup. move readout data to videpanel footers"*).
 * `leg` is `{ askedAt, firstMs, live }`.
 */
````

<a id="video-14"></a>
## video-14: demo/video/loopback.mjs, module, line 91

````js
/**
 * A canvas the size of the frame that leaves. The returns are drawn by the
 * test picture's own `drawCamera`, contained, no scrim, so the only difference
 * between the original and a return is the trip. `alpha` below 1 lays the
 * picture over the ground at that strength, which is how a picture fades out
 * over the last seconds of a press.
 */
````

<a id="video-15"></a>
## video-15: demo/video/loopback.mjs, module, line 119

````js
/**
 * The camera, the frame that leaves, and the controls that start it.
 *
 * `start` and `stop` are the PAGE's: the button and the camera picker call
 * them, so a press always goes through the page's own leg as well. The page's
 * `start` calls `open()` first and `stop` calls `close()` last. `render` is
 * called every animation frame while the camera is on, to paint the pictures.
 * `extra` is the one video element per return the page wants `armVideo`d on
 * the press, before any await, or iOS refuses it later.
 */
````

<a id="video-16"></a>
## video-16: demo/video/moq/index.html, inline script, line 34

````js
  // /video/camera/ with one round trip through a MoQ relay beside it.
  // The camera, with the clock burned into it, is encoded in this tab with
  // WebCodecs and published over MoQT (QUIC, by WebTransport) to Cloudflare's
  // public MoQ relay; the same session subscribes to that broadcast and decodes
  // what comes back. Both ends are this tab, so one clock stamps the frame and
  // reads it back, and the footer's delay is a median of exact differences.
  // The publisher and the subscriber are `startMoq` in demo/shell/moq.mjs, the
  // one /moq/ uses, given the camera to paint instead of testsrc2.
  //
  // It is video/030's WebRTC leg with the transport swapped: no WHIP, no WHEP,
  // no Stream input and no Stream minutes. The relay is Cloudflare's public
  // draft-14 relay (MOQ_RELAY), which keeps only the live edge and bills
  // nobody here.
  //
  // NOTHING OPENS ON A VISIT. The camera, the session and the subscribe are all
  // made on the start press; stop closes the session and every track.
  //
  // ⚠️ A VPN THAT DROPS UDP DROPS THIS TOO. MoQ rides QUIC, which is UDP. With
  // the Check Point tunnel up a session may not open at all (CLAUDE.md), so a
  // session that does not open says that is one possibility, never the cause.
  //
  // ⚠️ SAFARI IS REFUSED, ON PURPOSE. @moq/net blocks it by user agent because
  // of WebKit bug 319818 (positron-streaming), so moqSupport() says no and the
  // page says why before it asks for the camera.
````

<a id="video-17"></a>
## video-17: demo/video/moq/index.html, inline script, line 117

````js
  // The protocol's name is the footer's first word, not a plate over the picture
  // (asked 2026-10-13: *"rm labels on top of videos in loopback demos. move them
  // to videopanel fooers"*).
````

<a id="video-18"></a>
## video-18: demo/video/moq/index.html, inline script, line 287

````js
  // 🔴 SELF-CHECKS ONLY BEHIND ?selfcheck=1, and the round trip only behind
  // ?selfcheck=2, as on /moq/. The ordinary tier opens nothing.
````

<a id="video-19"></a>
## video-19: demo/video/recorder/index.html, inline script, line 42

````js
  // /video/camera/'s camera with a RECORDER. The camera's own MediaStream is
  // recorded with `MediaRecorder`, at most 10 seconds, kept in IndexedDB in
  // this browser, and played back in the right panel on the kit's transport bar
  // and timeline glued together, as /synth/timeline/ does for notes.
  //
  // THE BAY: camera -> screen is the left panel. camera -> rec -> store ->
  // player -> playback is the right one. The recorder, `web:rec`, takes the
  // camera on `rec:video-in` and hands the finished file out of `rec:file-out`
  // into a store node labelled "this browser", `web:store`. That link rides
  // `indexeddb`, which is what bay.mjs's TRANSPORTS table chooses for `file` on
  // one machine; the read back out of the store into `web:player` is READS'
  // machine cell, `indexeddb` again.
  //
  // ONE TAKE, REPLACED EACH TIME. A new recording overwrites the stored one, so
  // this browser holds at most one ten second take for this page.
  //
  // ONE SCALE. The strip is fitted to 0 to 10 s once and never refitted, so a
  // short take fills the part of the line it covers rather than the whole
  // width, whether it was just recorded or read back after a reload.
  //
  // 🔴 NOTHING OPENS ON A VISIT. The camera is asked for on its press.
  // IndexedDB is not opened, read or listed on load, not even to show whether a
  // take exists: it is opened on the first record, or on the first play when no
  // take is in memory, which is how a take recorded before a reload comes back.
  // Nothing ever leaves this machine.
````

<a id="video-20"></a>
## video-20: demo/video/recorder/index.html, inline script, line 153

````js
  // ── the store: one take in IndexedDB, the /stage/ pattern ───────────────
  // One record under one key, written once when a take has landed (ten seconds
  // of picture is one Blob, so there is nothing to write piece by piece). A
  // browser that refuses IndexedDB (a private window can) keeps the take in
  // this tab's memory, and the log says which.
````

<a id="video-21"></a>
## video-21: demo/video/recorder/index.html, inline script, line 212

````js
  // ── the timeline: a deck, its bar and its strip ─────────────────────────
  // The deck's range is 0 to 10 s for the page's whole life. While recording
  // it runs on its own clock from 0; once a take is in the player the player's
  // element is the clock (media-master's L1) and the deck follows it, stopping
  // where the take ends.
````

<a id="video-22"></a>
## video-22: demo/video/shader/index.html, style, line 16

````css
  /* The camera as it is on the left, the shader's picture on the right, each
     half the content width (asked 2026-10-10, *"keep original 1/2 left, shader
     1/2 right"*). On a phone they stack, the original first. */
````

<a id="video-23"></a>
## video-23: demo/video/shader/index.html, inline script, line 35

````js
  // /video/camera/ with a shader beside it. The camera feeds two pictures: the
  // original, camera -> screen, drawn as 60 draws it, and the shader's, camera
  // -> shader -> dither. The shader is a node of its own, `web:shader`, with
  // a video-in and a video-out, and each picture follows its own links. One
  // knob, its own node, is cabled into `web:shader:value-in`.
  //
  // THE LOOK is a two tone ordered dither: a 4x4 Bayer matrix over the frame's
  // brightness, the page's own dark ground for off and a warm off-white for
  // on, with the brand yellow only where the picture is brightest. It is the
  // site's mono, dark surface drawn out of the camera, and nothing else.
  //
  // NOTHING OPENS ON A VISIT, and nothing ever leaves this machine. The camera
  // is asked for on the start press; stop ends every track.
````

<a id="video-24"></a>
## video-24: demo/video/shader/index.html, inline script, line 141

````js
  // An empty picture is the page's own ground, the dither's dark, not black
  // (asked 2026-10-10, *"keep same bg color initially"*).
````

<a id="video-25"></a>
## video-25: demo/video/webrtc/index.html, inline script, line 31

````js
  // /video/camera/ with one round trip through Cloudflare beside it. The
  // camera, with a clock burned into it, feeds two pictures: the original as
  // it leaves the page, and a WebRTC loopback, camera -> Stream WebRTC input
  // by WHIP -> back by WHEP. The returned picture carries the clock row, so
  // its footer reads the glass to glass delay off the frames actually shown.
  // The publish goes through the worker, so no input key reaches this page.
  // Until 2026-10-12 this page also held the LL-HLS round trip; that is
  // /video/llhls/ now (*"Split hls and webrtc loopbacks"*), and what the
  // two share is /video/loopback.mjs.
  //
  // 🔴 EACH PRESS IS REAL CLOUDFLARE STREAM MINUTES, AND THE CAP IS 30 SECONDS
  // FROM WHEN THE WHIP PUBLISH IS ACCEPTED. Billed by the minute delivered
  // whatever the protocol (positron-streaming). Asked for: "limit to 10 sec.
  // just fade out", then "limit to 20sec. fade out sloowly", then (2026-10-12)
  // "extend to 30s". Thirty seconds after that both pictures have faded to the
  // ground over their last three and the page stops itself exactly as a stop
  // press does. WHIP records nothing, so there is nothing left to delete.
  //
  // 🔴 THE WebRTC LEG SHARES /cam/'s ONE WHIP INPUT. The worker allows one
  // camera on it at a time, so a publish answered 409 means /cam/ is on air.
  // That is said in words, and nothing is retried.
  //
  // ⚠️ A VPN PASSES THE HANDSHAKE AND DROPS THE MEDIA. With the Check Point
  // tunnel up, WHIP and WHEP both answer 201 and no frame ever arrives (CLAUDE.md,
  // measured 2026-09-25). So when the play side has signalled and no frame has
  // been decoded after a while, the log names that as one possibility, never as
  // the cause.
  //
  // NOTHING OPENS ON A VISIT. The camera, the relay servers, the publish and
  // the play are all made on the start press.
````

<a id="video-26"></a>
## video-26: demo/video/webrtc/index.html, inline script, line 66

````js
  // 30 s a press from the accepted publish, the last 3 of them a fade (asked
  // 2026-10-10, *"fade out bit faster, both videopanels"*; 2026-10-12, *"extend
  // to 30s (all 20s limits)"*). BACKSTOP_MS arms the cap anyway if the publish
  // has not started it by then.
````

<a id="video-27"></a>
## video-27: demo/video/webrtc/index.html, inline script, line 72

````js
  // No readout: every number is in the footer of the picture it is about
  // (asked 2026-10-12, *"move readout data to videpanel footers"*).
````

<a id="video-28"></a>
## video-28: demo/video/webrtc/index.html, inline script, line 116

````js
  // The footer: the delay read off the clock, then what getStats() of the
  // WHEP connection measured, each cell empty until it has been read. The
  // word at the left is where the round trip has got to.
  // ⚠️ THREE CELLS, BECAUSE THE STATE WORD AND THREE IS WHAT FITS ONE LINE OF
  // A HALF PANEL AT 1280 (MEASURED in a 1280 shot, 2026-10-12: with four the
  // state was cut to `playin` and the rtt to one digit). The size and the rtt
  // are in the row's hover beside the codec and the decoded and dropped counts.
````

<a id="video-29"></a>
## video-29: demo/video/webrtc/index.html, inline script, line 132

````js
  // 🔴 THE PICTURE SAYS WEBRTC, ALWAYS, EVEN STOPPED. Reported 2026-10-12:
  // *"not clear that this is webrtc"*. On the panel's own tag plate, top left
  // of the picture, where it stays in full screen.
  // The protocol's name is the footer's first word, not a plate over the picture
  // (asked 2026-10-13: *"rm labels on top of videos in loopback demos. move them
  // to videopanel fooers"*).
````
