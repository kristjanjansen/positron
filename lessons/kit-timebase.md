# Kit lessons: timebase.mjs, timebase-test.mjs

The long comments cut from `demo/shell/timebase.mjs` and `demo/shell/timebase-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-timebase.md#<anchor>`.

<a id="header"></a>

## timebase.mjs, file header

demo/shell/timebase.mjs: when a light event should land, against a heavy link's picture or sound.

  node demo/shell/timebase-test.mjs

plans/plan-routing-time.md is the why. This is step 1 of it: the arithmetic,
with no page, no socket, no element and no clock of its own. Every time it
handles is passed in, so the whole policy is gradable in node.

THREE CLOCKS, AND EVERY NUMBER HERE SAYS WHICH ONE IT IS ON.

  local   this document's `performance.timeOrigin + performance.now()`, ms.
          What a page can actually set a timer against.
  shared  the peer clock: local + offsetMs, where offsetMs is
          `peer.offsetMs()` from proto/looper/peer.mjs. MEASURED to agree
          across two machines to ~3 ms (demo/jam/index.html). `null` until a
          page has agreed with anybody, and null is NOT zero.
  stamp   whatever a heavy link's own media carries: a PDT on LL-HLS, an RTP
          or sender-report time on WebRTC, a frame timestamp in a MoQ
          container, the double in the Pi's 12-byte PCM header, currentTime
          on a recording. Each link says how a stamp becomes shared time
          (`stampOffsetMs`), and when nobody knows, it says null.

WHAT A HEAVY LINK GIVES THIS MODULE: observations. Each is a pair
`{ local, stamp }` meaning "the moment stamped `stamp` was on the glass (or
at the ear) at local time `local`". A rVFC callback gives one per frame
(expectedDisplayTime, and mediaTime or a PDT); `hls.playingDate` gives one
per poll; a PCM playout gives one per frame it schedules. The module keeps
the MEDIAN of the recent `stamp - rate * local` differences, so one late
timer read does not move a caption, and it re-anchors only on a STEP: a run
of `stepCount` observations all off the median by more than `stepMs` on the
same side. That is the drift-seek, the rebuild, the jitter buffer growing,
a seek in a recording. MEASURED shapes it has to survive are in the plan §3.

WHAT A LIGHT EVENT CARRIES: `at` and its siblings, flat on the event, and
nothing else is read.

  no at, beat or stamp           as it happens: fire on arrival
  { at: S }                      scheduled ahead: fire when the peer clock reads S
  { at: S, follow: id }          fire when the moment S reaches THIS glass on link id,
                                 i.e. S plus that link's lag here. Needs the link's
                                 stamps to be convertible to shared time.
  { stamp: M, on: id }           fire when link id PRESENTS the moment stamped M.
                                 Needs no peer clock at all: it is local to the link.
  { beat: B, clock: {bpm, epoch}, follow? }
                                 a beat on a loop clock (plan-xr-together), which
                                 is a shared time by arithmetic

`at` ALWAYS MEANS WHEN THE THING HAPPENS, decided by the owner 2026-10-04: a
timeline row's position (`timeline/transport.mjs`) and, on the wire, an
event's moment in shared ms. `when` stays the uncertainty bracket around an
`at`. The wire envelope's send stamp, which used to be called `at`, is `sent`
now, and `parse()` in `wire.mjs` renames an old sender's envelope `at` to
`sent` before anything here can mistake it for an event time.
⚠️ `on` IS A LINK ID ONLY WHEN IT IS A STRING. A light's payload may say
`on: true`, and that is not a request to wait for a link called true.

🔴 CANNOT TELL HOLDS, IT NEVER FIRES. Every method answers null when the
inputs do not determine an answer (no peer clock, no observation yet, a link
whose stamps nobody can put on the shared clock, a paused recording), and
`decide` turns null into `hold`. A caption fired at the wrong moment cannot
be taken back; `src/timed-messages.js` paid for reading "cannot tell" as a
number and this module copies its answer.

<a id="test-header"></a>

## timebase-test.mjs, file header

demo/shell/timebase-test.mjs: when a light event lands against a heavy link, with no browser.

  node demo/shell/timebase-test.mjs

`timebase.mjs` takes every time it uses as an argument, so the whole policy
is gradable here. Every expected value below is worked out by hand in the
comment above it, from the module's stated rule and not from its code,
because a test that recomputes the module's formula catches a typo and never
a misreading (the `timeline/csound.mjs` lesson).

FOURTEEN OF THE 43 ARE NEGATIVE CONTROLS, marked `NEGATIVE CONTROL` and
counted at the end. They are written so the bug they name fails them.

TWELVE SABOTAGES, each run on a copy of the module (and of `wire.mjs`) in a
scratch directory with this file beside it, 43/43 before every one. S1 to S7
were first measured 2026-10-04 against the 39 of the `due` shape and were
RE-RUN the same day after `due` folded into `at`; S8 to S12 are the shape's
own and the wire's:

  S1  the median replaced by the last observation         2 red
  S2  the peer offset's sign flipped                      9 red (8 before the wire round trip)
  S3  a step never confirmed, so the line never moves     2 red
  S4  an unknown stamp clock read as 0 when following     1 red
  S5  the rate ignored when anchoring a recording         1 red
  S6  `decide` firing now when it cannot tell             1 red
  S7  deviants pushed into the median window as well      1 red (the first
      run's 3 was a different way of writing the same bug, not kept)
  S8  `follow` ignored, scheduled on the peer clock       4 red
  S9  any `on` read as a link id, `on: true` included     1 red
  S10 `parse()` not normalising an old envelope           1 red
  S11 an event still carrying `due` not refused           1 red
  S12 normalising sets `sent` and keeps the old `at`      1 red

⚠️ S2 HAS A SURVIVOR AND IT IS RIGHT TO SURVIVE. `following the video,
shared 60000 fires at local 59929.5` stays green with the sign flipped,
because when the light event and the video are stamped on the same shared
clock, follow is `S - d` and the receiver's own offset cancels out. A
receiver that follows a shared-stamped link does not need to have agreed a
clock itself; only the senders do. Kept, not tuned away (plan §3.3).

WHAT IS NOT GRADED HERE: whether any real transport's observations look
like the ones fed in. The jitter, the step sizes and the latencies are
positron's measured figures (plan §3), but they are typed in, not observed.
Grading against a real stream is plan step 3 and later.

<a id="test-flat-at"></a>

## timebase-test.mjs, events carry at flat

The decision of 2026-10-04: an event carries `at` (shared ms) flat, and the
envelope's send stamp is `sent`. Offset 137.5, so shared 60000 is local 59862.5.
