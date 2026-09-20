# plan-live-timeline — ERR live on the line, with the present as the right-hand end

Status: **not started.** Written 2026-09-08, out of "err live feeds in timeline
(playhead keep on moving, allow backseeking if possible)". Proposed slug
**`now`**, Act 5 (*archives*), directly after `flipper`.

Read `demo/flipper/index.html` first — this plan does not re-derive one line of
what that page learned about ERR, and every place it departs from it is argued
below. Read `demo/reel/index.html` second: `now` is its sibling and should look
like it — one line, an absolute axis, a page that streams and stores nothing.
Everything marked **✅ 2026-09-08** here was probed while writing this, from
this machine, in Estonia, at ≤ 1 request per 200 ms with two-byte range GETs.

---

## 0. One line

One ERR television channel on a line whose right-hand end is the present
moment: the playhead advances in real time at the live edge, the two hours ERR
still holds are behind it and can be seeked into, and the seven-second gap
between *now* and *the frame on the glass* is drawn rather than hidden.

**The one place this plan does not do what the request literally says**: the
playhead does **not** keep moving when the picture stalls. A second line — the
present — does. §5 is the argument, and it is the design's centre rather than a
concession.

---

## 1. What was measured today

### The live playlists — re-probed, not trusted

CLAUDE.md records ERR live as "live PDT + 2h DVR + CORS clear". All three hold,
and there is more in the playlist than that summary carries.

| thing | status |
|---|---|
| `GET live.err.ee/live/{etv,etv2,etvpluss}.m3u8` | ✅ 2026-09-08 — 200, `access-control-allow-origin: *`, `cache-control: max-age=2`, HLS v7 |
| ladder | ✅ 320×180 / 704×396 / 1280×720 / 1920×1080, 25 fps, `avc1` + `mp4a`; audio a separate group (`et` **and** a `zxx` clean-audio rendition); `et`/`ru`/`und` subtitle tracks; an I-FRAME playlist per rendition |
| segments | ✅ fMP4 (`EXT-X-MAP` + `.m4s`), `#EXT-X-TARGETDURATION:2`, `#EXT-X-INDEPENDENT-SEGMENTS` |
| **window** | ✅ **3750 segments × `EXTINF:1.92` = 7200.00 s = 2.0000 h exactly.** One distinct EXTINF value across the whole 3750 — not a nominal 2 h with ragged edges |
| **PDT** | ✅ **exactly ONE `#EXT-X-PROGRAM-DATE-TIME`**, on the *first* segment, microsecond precision, plus `#USP-X-TIMESTAMP-MAP:MPEGTS=…,LOCAL=…`. So wall time of segment *i* = head PDT + *i* × 1.92 s. (`reel`'s archive playlists carry none at all — this is the difference that makes a live line possible.) |
| discontinuities | ✅ **zero** `EXT-X-DISCONTINUITY`, zero `EXT-X-DATERANGE`, no `EXT-X-KEY` |
| delta playlists | ✅ **`#EXT-X-SERVER-CONTROL` is ABSENT** → no `CAN-SKIP-UNTIL`, so every refresh re-fetches **217,851 bytes** |
| segment CORS | ✅ 200/206 with `access-control-allow-origin: *`, honours Range (`content-range: bytes 0-1/251131`) |
| curiosity | ✅ segments carry `cmsd-static: at=…,ept=…` (epoch ms). Meaning ⚠️ unverified; not used |

**The media sequence number is a shared wall-clock grid.** At 13:37:33Z `etv`
and `etv2` carried the *same* `#EXT-X-MEDIA-SEQUENCE` (931701781) and the *same*
head PDT. `SN × 1920 ms` lands 951 ms from the head PDT — a constant offset, so
the sequence number is a coordinate both channels and the wall clock agree on.
Useful as a cross-check; **PDT stays the authority**, because the 951 ms is one
measurement and nothing promises it is fixed.

### How live the live edge is

Five playlist fetches, 4 s apart, `edge = headPDT + 3750 × 1.92 s`:

```
edge lag vs this machine's clock:  0.70  0.97  1.23  3.42  1.76  s
window slid 15.36 s of head PDT over 16.415 s of wall  (media sequence +8)
```

So the window really does advance at 1.0×, and the newest instant the manifest
offers is **0.7–3.4 s** behind now — one segment of quantisation plus the
`max-age=2`. Two more facts fell out:

- **one segment PAST the manifest edge is already served** (206); two past is
  404. The origin publishes one ahead of what it advertises.
- **a segment older than the advertised window start is a 403 with NO ACAO** —
  *the same signature as a rights refusal*. §4 turns on this.

### How far back you can actually go — measured, not the advertised number

Binary search on `etv`, 10 probes, 2026-09-08 13:40Z:

```
advertised window        3750 segs   = 120.0 min
oldest segment served     +339 segs  =  10.8 min BEFORE the advertised start
total servable depth      4089 segs  = 130.8 min
```

⚠️ **One measurement, one channel, one instant.** The 10.8 min is almost
certainly cache retention rather than a promise, and a demo must never draw it
as if ERR had offered it. The number the page prints is *what the last probe
found*, with the probe time beside it.

### The programme schedule is reachable, and it is good

Found by reading `otse.err.ee`'s bundle for `/api/` paths.

| thing | status |
|---|---|
| `GET www.err.ee/api/tvSchedule/getTimelineSchedule?day&month&year&channel` | ✅ 2026-09-08 — 200, `access-control-allow-origin: *`, JSON, **204,757 bytes**, 195 ms, 29 entries for `etv` |
| shape | ✅ `startTime` / `endTime` in **epoch seconds**, plus `name`, `programName`, `seriesTitle`, `lead`, `mediaExist`, `url`, `tzOffset: "+0300"` |
| contiguity | ✅ **29 of 29** entries satisfy `startTime === previous.endTime`. A gapless span lane, straight out of the API |
| broadcast day | ✅ runs **05:45 local → 05:45 next day**, so a 2 h window crosses it once a day and needs yesterday's fetch too |
| radio twin | ✅ `api/radioSchedule/getTimelineSchedule` — 200, but **704,636 bytes** for `vikerraadio` (3.4× heavier; photos and article bodies). Not used |
| `api/geoblock/inEstonia` | ✅ `true` from here; `getRegionalData` → `{inEstonia:true,inEuropeanUnionExceptEstonia:false}`; ACAO `*` |
| `api/time/getTimestamp` | ✅ epoch seconds, ACAO `*` — a second opinion on this device's clock |

### The shortcut I checked and rejected

The EPG carries **`streamGeoblocked`** and **`catchupGeoblocked`** per
programme. It is extremely tempting: a per-programme rights flag, with exact
start and end times, in the same domain as the deck — the refused stretch,
named, for free.

**It does not predict what ERR refuses.** In the three channels' current 2 h
windows, **14 of 16 programmes carry `streamGeoblocked: true`** and every one of
them was served. And `streamGeoblocked === catchupGeoblocked` on **all 105
entries** across the three channels today — one fact wearing two names.

So the flag means "geo-restricted", and from inside Estonia the restriction is
satisfied. **Drawing it as the blocked region would be drawing a claim as
though it were a measurement**, which is the one thing this project's colour
rules exist to prevent. The refused stretch comes from the probe, or it is not
drawn. The flag may still be worth printing as *what ERR says*, in words, in the
programme lane's tooltip — never as ink in the served lane.

### And the refusal itself did not reproduce

CLAUDE.md's hardest-won ERR fact, swept 2026-09-06: `etv` refused its newest
~45 min, `etv2` its oldest ~78 min, `etvpluss` everything served. Today:

```
13:37Z  13 points × 3 channels    .............   × 3
13:45Z  21 points × 3 channels    .....................  × 3
                                  102 probes, ZERO refusals
```

Both statements are true. The 09-06 sweep happened; today's found nothing. What
that means for this build, and it is a design constraint rather than trivia:

**the refused stretch is intermittent, and most visitors most of the time will
see none of it.** A demo whose subject is the wall would therefore be a demo
that usually has nothing to show. `flipper` is already that demo and it survives
because the wall is what it *found*, not what it is *for*. `now` is about the
moving line; the wall is a lane that says **"13 asked · none refused"** in words
when there is nothing to draw — which is exactly CLAUDE.md's rule that a lane
with nothing to say must say so rather than go blank.

⚠️ **Unsettled, and it cannot be settled from here**: whether the refusal is
per-programme rights *or* the visitor's location. From Estonia there is nothing
to correlate against. The test that would answer it is the same sweep from a
non-Estonian egress, and this machine has none.

---

## 2. The position domain, and a range with two moving ends

### The domain is absolute epoch milliseconds, from ERR's PDT

`reel` established absolute epoch ms as a legal position domain and paid for it
(a deck opening at 0 outside its own range — fixed in `createDeck`, not worked
around). Live is the same domain with the sign flipped: 1965 is negative, now is
+1.79e12.

The alternative — 0-based media time, which is what `flipper` uses (`anchorMs:
0`, positions are `currentTime × 1000`) — is rejected for three reasons, each
concrete:

1. **The EPG is in epoch seconds.** A programme lane in media time needs a
   conversion per row per refresh, and the conversion is exactly the PDT
   mapping we would need anyway.
2. **Media time is not stable across a reload.** hls.js's timeline origin moves
   when the instance is rebuilt; wall-clock instants do not. A page that can
   say "you were watching 14:03:12" survives its own recovery.
3. **The axis has to read as a clock.** `formatTime(..., absolute)` prints
   `d.toTimeString()` at minute and second zoom — the visitor's local time,
   which is the only labelling a live line can honestly carry. `flipper`'s
   axis reads `0:00.000` off a 2 h media window, which is a duration where a
   time of day belongs.

**Which clock supplies the epoch**: ERR's PDT, not `Date.now()`. The picture's
position is `headPDT + fragment offset`, read from `hls.playingDate` (hls.js) or
`video.getStartDate() + currentTime × 1000` (native) — see §5. A visitor whose
device clock is ten minutes wrong still gets a correct line, and the
disagreement is a readout cell rather than a silent lie.

### The range is `[edge − reach, edge]` and both ends move. It has to.

The deck's range is defined as *the seekable window in the position domain*.
For a live DVR that window genuinely slides at 1.0× — both ends. Fixing it at
load would claim you can seek to material ERR has already dropped and to a
future that does not exist. So:

```js
deck.setRange([edgeMs - reachMs, edgeMs]);   // once a second
```

**What has to change in the library: nothing.** `setRange` already does all of
it, and its own comment says so:

- `deck.range` keeps its identity (the array is mutated in place), so the strip
  and the transport bar, which both hold that reference, stay correct;
- `durationMs` is a getter and follows;
- a playhead now outside the window is moved with a **real `seek()`** — reduce
  + assertState — never a silent clamp;
- the scheduler's lanes and cursors are untouched: range is a window on
  positions, not a filter on events.

**What has to change in the shell: two things, both in `transport-bar.mjs`, and
both are latent defects on `flipper` today.** §11 and §12.

**Cadence: 1 Hz, not 4 Hz.** `setRange` bumps `rangeGen`, and `rangeGen` is the
key of the strip's span cache — so every call re-derives every span lane. At
1 Hz with ~58 EPG rows (two broadcast days, one channel) plus a handful of
watched stretches, that is nothing; at `flipper`'s 4 Hz it is four times nothing
for a picture that moves 4 px per minute. State the cadence beside the call, do
not tune it.

**`edge`, not `now`, as the right end.** You cannot seek to `now` — the newest
instant ERR offers is 0.7–3.4 s behind it. So `range[1] = edge` and the present
is drawn *outside* the seekable window, as a separate line. That small gap is
itself a measurement (`edge` in the readout) and the page says what it is.

### What a moving range does to the view: nothing, on purpose

`createStrip` fits the view to `deck.range` **once**, at construction, and never
again. Nothing in `setRange` touches `S.view`. So the axis does not move when
the range does — there is no jitter to fight, because nothing is pinned.

That is also the right *picture*, and LESSONS #32 is why. `take` learned that a
scale which grows with the thing cannot show it growing. The live analogue: **an
axis that slides with the playhead cannot show the playhead moving.** If the
view were pinned to `[now − 10 min, now]`, the playhead would sit at a fixed x
forever and the demo's entire subject — the line advancing — would be invisible.

So the view is fixed and the reader pans and zooms it. The playhead and the
present march rightward across it. When the playhead crosses 82 % of the plot,
the strip's existing follow mode flips the window **once**, by a page — the
behaviour written because "demo9 re-centred every frame and fought the user".
Any scroll or drag disengages follow; the *Live* control re-engages it. That is
back-seeking and returning to live expressed in the component that already
exists, with no new code.

Opening view: **twelve minutes**, fitted so the present sits about three
quarters across. Two hours across a phone puts a 25-minute programme in 60 px,
and the wide view is discoverable from the narrow one rather than the other way
round — `reel` went year, then week, then **six hours** for exactly this reason,
and each step made the marks mean more.

---

## 3. How far back you can actually go, said honestly

The advertised window is 120.0 min and the measurement is 130.8. The page prints
**what the last probe found**, never the advertised number, and the served
lane's gutter carries the probe time. Three consequences:

- **"Back 10 minutes" is always safe**; "back 2 hours" is at the edge of what is
  advertised and inside what was measured once.
- The *oldest* thing you can watch is being eaten at 1.0×. If the reader seeks
  near it, the gutter can say **"the oldest thing here is gone in 3.4 min"** —
  a number that moves, that nothing else on the page says, and that is the DVR
  explaining itself.
- When the window does eat the playhead, `setRange` performs a real seek
  forward and the page must **say so in the log**. A picture that jumps with no
  explanation is indistinguishable from a bug.

---

## 4. The refused stretch, as a region of the line

### First, the trap that today's measurements exposed

`flipper`'s probe treats **403-with-no-ACAO** as "rights refusal". Today's
sweep shows the *same* status and the *same* missing header for a segment that
has simply **fallen off the back of the window** (SN − 1000 → 403 no ACAO;
SN − 30 → 206). The signature does not distinguish the two.

**So the probe must only ever ask about segments that are in the current media
playlist.** Membership is the discriminator; the status code is not. `flipper`
happens to satisfy this because it indexes into the playlist it just fetched —
but it is satisfied by accident, and this plan states it as the rule.

### What it looks like

Interpolating between two probes is fabrication, so the served lane draws
exactly what it asked:

| ink | means | how it got there |
|---|---|---|
| grey | **we did not look** | never probed |
| green | ERR served this one | 2-byte GET → 200/206 |
| red | ERR refused this one | 2-byte GET → 403 / CORS failure |
| slate | we asked and cannot say | network error that is not a refusal |

This is CLAUDE.md's table unchanged — colour says **how it landed**, never which
lane — and it is the only reading that keeps "we did not look" apart from "we
looked and it was fine".

**A refused stretch becomes a filled REGION only where it has been bracketed.**
Coarse sweep first (13 points across the window, `flipper`'s method); if any
point refuses, binary-search each boundary to **±1 segment = ±1.92 s** (10
probes bounded the old edge this morning). Then, and only then, the span
between two probes that bracket a boundary is drawn filled, because both its
ends are measured. Everywhere else stays grey, and the gutter says how many
points were asked.

### What the page asserts about it

Never "there is a blocked region" — today there is not one, and an assert that
depends on ERR's schedule is an assert that reads red for a reason that is not
ours. What it asserts is the **mechanism** (LESSONS #27):

- every probed instant is inside the current playlist;
- every probe result is one of the four states above, with no fifth;
- a refusal, if any, was bracketed to ≤ 2 segments before it was drawn filled;
- the count of probes issued is under the page's own cap.

And the wall handler is `flipper`'s, unchanged and imported: **three consecutive
`fragLoadError`s → `stopLoad()`, not `pause()`** — it cost 1794 refused requests
in one run and 113 s of thrown-away picture to arrive at, and none of that is
re-derived here.

---

## 5. Which clock drives the playhead, and what a stall does

### Two clocks, two lines, one gap

There are exactly two quantities and the page draws both:

| line | what it is | does it stall? |
|---|---|---|
| **the playhead** (white) | where the frame *on the glass* sits in wall-clock time | **yes** |
| **the present** (orange, dashed) | now | **no** |

The strip already draws the second one, including the shaded band between them
and a label reading `7.02 s offset`. `armWall(pos)` + `wallPos()` is the "dual
cursor" the component was built with; `take` uses it as a recording head. Here
it needs no new code at all — arm it once with the present and the gap draws
itself.

### The argument for the playhead stopping

L1 of `media-master.mjs` says the picture is ground truth and the vector bends
to it. The question the request raises is whether that is right for a live edge
that "must keep advancing even when the picture stalls".

**It is right, and the reason is what the playhead is a claim about.** The
playhead's position asserts *this is the instant you are looking at*. If it kept
advancing through a stall it would assert you were seeing a frame from a moment
whose frame has not arrived. That is the fabricated-number class (LESSONS #15,
#24) drawn as ink rather than printed as a digit: a page that is confidently
wrong, with no assert able to catch it.

The thing that must keep moving is **the present**, and it does, because it is
not derived from the picture at all. So during a stall:

- the playhead stops on the last frame actually shown;
- the present keeps advancing;
- **the gap between them grows, visibly, and the label counts it up**;
- the readout `behind` climbs out of its normal 6–9 s band;
- `state` reads `stalled`.

The stall is not hidden and it is not faked — it is drawn as the one thing it
actually is, a growing distance between what time it is and what you can see.
That is a better answer than either of the two the question offers.

### The configuration that produces it

```js
mediaMaster(deck, video, {
  anchorMs: () => pdtOriginMs,   // ERR's PDT origin, refreshed on LEVEL_UPDATED
  stallPolicy: 'hold',           // L3: the playhead stalls WITH the picture
  autoPlayPause: true,           // L5: paused element ⇒ paused deck
  toleranceMs: 40, jumpMs: 250,  // defaults; a back-seek is a jump, not drift
});
```

`stallPolicy: 'hold'` because there is exactly one master and nothing to fall
back to — `'release'` exists for a grid of tiles. `jumpMs: 250` default is
correct here and is the whole reason the helper exists: a back-seek is a
**discontinuity**, and L2 routes it to `deck.seek()`, which reconciles statuses
and re-folds, instead of leaving every event in between pending to be burst.

**The page must run its own rAF loop calling `master.tick()`.** `flipper` does
not, and so its deck is driven only by the L4 `timeupdate` backstop at ~4 Hz —
which works, coarsely, and has a side effect that bites in §11. The same loop
is where the watched-stretch lane grows (LESSONS #32: a thing that should look
continuous needs a frame rate, not an event) and where `strip.invalidate()` is
called *while the deck is paused*, because the strip's redraw gate is
`S.dirty || p !== S.pos || (wallAnchor && deck.playing())` — during a stall none
of the three is true and **the present would freeze on screen at exactly the
moment it must not**.

### The device's own clock, measured once and printed

`wallPos()` advances on `performance.now()`, so the present line is smooth by
construction. What it is *anchored* to is a choice:

- anchoring to the manifest edge would make it **jitter by up to 2.7 s**, which
  is the measured spread of the edge lag. Rejected.
- anchoring to `Date.now()` is smooth, and wrong by however wrong the device is.

So: **anchor to `Date.now()`, measure the disagreement against ERR, print it,
and never silently correct it.** The measurement is free — the `date:` header on
the playlist fetch we already make — and the project's own method applies: keep
the sample with the **minimum round trip**, never an average (`proto/looper/
peer.mjs`, where an average is dragged by every queued packet). One second of
granularity is coarse and entirely sufficient for the failure that matters,
which is a device minutes out. Readout cell `your clock`, in seconds.

*A correction is applied by measuring, never by jumping* — the same rule that
governs a late layer in the looper.

---

## 6. Back-seeking, and what "live" means as a position

### The mapping exists on both engines. This is what makes the demo possible.

| engine | media time → wall clock | wall clock → media time |
|---|---|---|
| hls.js 1.7.1 (bundled) | `hls.playingDate` | `currentTime += (want − playingDate) / 1000` |
| native (WebKit) | `video.getStartDate() + currentTime × 1000` | `currentTime = (want − getStartDate()) / 1000` |

`playingDate`, `liveSyncPosition` and `Fragment.programDateTime` are all present
in the vendored `proto/remixer/hls.min.js` (**1.7.1**, grepped). `getStartDate()`
is already used by `src/low-latency-player.js` for native PDT latency. **Nothing
new is needed on either path** — the seek is one subtraction.

Prefer the *delta* form (`currentTime += want − playingDate`) over rebuilding
the absolute: it needs no assumption about where hls.js put its timeline origin,
and it is correct across an instance rebuild.

Native HLS is gated on **`ManagedMediaSource`**, never on `canPlayType` —
`"maybe"` in Chrome as well as Safari is what left 291 asserts green across
three pages that had never played a frame. Copied verbatim from `flipper`.

### "Live" as a position

`live` = `hls.liveSyncPosition` (hls.js) or `seekable.end(n−1)` (native), and
**not** the newest instant in the playlist: the hold-back is real and jumping
past it lands the playhead where no fragment has been fetched. `flipper`'s
*Jump to live edge* already re-probes rather than jumping blind, because
`liveSyncPosition` inside a blackout kills a picture that was playing. Reuse it.

The arithmetic worth printing in the paragraph:

```
now − newest instant ERR offers      0.7 – 3.4 s   (measured today)
hls.js hold-back, 3 × 1.92 s              5.76 s   (liveSyncDurationCount: 3)
                                     ------------
picture behind now                    ~6.5 – 9 s
```

corroborated by 2026-08's in-player `hls.latency` of **5.9–6.1 s**. So `behind`
has a *known band*, which is what lets a colour scale be calibrated against what
the mechanism promises rather than against an ideal (LESSONS #17): green in
5–10 s, amber to 20, red past that. **A green reading is the normal reading**,
and the paragraph says seven seconds is what a live picture costs.

### What is deliberately NOT reused from `src/low-latency-player.js`

The drift-seek machinery, the stall watchdog, the starved watchdog, the source
watchdog and the rebuild ladder. All of it, on purpose.

That player exists to hold a ~3 s latency target against **Cloudflare LL-HLS**:
0.5 s parts, `PART-HOLD-BACK=1.5`, one INDEPENDENT part per 2.0 s GOP — a target
that is structurally unreachable, which is why every knob in it exists. Its own
v8 header records what chasing it cost: *"RESYNC drift fired every 2–3 s for two
solid minutes, each one immediately followed by ERR aborted on BOTH tracks …
some seeks went out with buf=0.02"* — the recovery loop **was** the jank.

**ERR is not that stream.** No parts, no `PART-HOLD-BACK`, no
`EXT-X-SERVER-CONTROL`, 1.92 s segments, and a hold-back of three of them.
There is no latency target to hold: being ~7 s behind is the medium, not a
defect, and the page's job is to *draw* that distance, not to close it.

So: **plain `Hls` with `flipper`'s config, and the only seeks are the ones the
reader asks for.** `maxLiveSyncPlaybackRate` stays at its default of 1 (no
catch-up nudging) and `liveMaxLatencyDurationCount` stays `Infinity`, so a
back-seek *sticks* rather than being yanked back to the edge — ⚠️ read the
bundled defaults in P3 and assert the config, rather than trusting this
sentence.

*A recovery action is not free.* This page has one recovery action, `flipper`'s
wall handler, and it yields rather than retries.

---

## 7. What is on the line

### One channel, three lanes

**One channel**, `etv`, and no switcher. `flipper` is the channel switcher and
its whole design is "only the open channel loads"; three channels here would
mean three 218 KB playlists every 2 s (≈ 0.33 MB/s of manifest alone), three
decoders, and two lanes showing a picture nobody is playing — while the deck can
only ever have one playhead. The channel's name is the picture lane's label,
which is where lane identity belongs.

| lane | the question it can answer | ink |
|---|---|---|
| **picture** | *what have I actually seen?* | one span per continuous stretch watched, growing at frame rate; a gap wherever a seek skipped |
| **served** | *will ERR hand this over?* | one mark per probe; a filled region only where a boundary was bracketed (§4) |
| **programmes** | *what is on?* | contiguous named spans from ERR's schedule |

Each lane answers for its own number and no other — *a number belongs to the
lane that can answer for it*. The served lane may not colour the picture lane's
ink, and the programme lane's `streamGeoblocked` flag may not colour the served
lane's (§1).

Picture-lane colour follows the house table: **green** = shown; **amber** =
shown but frames were dropped in this stretch (`getVideoPlaybackQuality()`
attributed to the stretch being watched — ⚠️ availability on WebKit unverified);
**slate** = shown but this lane cannot say how well (no quality API); **grey** =
never played. Every one of the four is reachable, which is what makes it a scale
rather than a decoration.

### Gutters — what each lane measured, never instructions

```
picture     watched 4.2 min in 3 stretches · 12 frames dropped
served      13 asked · none refused · oldest served 130.8 min back · 13:40
programmes  4 in the window · next boundary 14:30 · from ERR's schedule
```

*A gutter carries what its lane measured.* "Press Back ten minutes" belongs in
the paragraph, and if the reader cannot tell what to press, the control's label
is what gets fixed.

### Considered and rejected: a programme lane per channel

Three schedules is 3 × 205 KB, once, and it would let the line say the one thing
a single video cannot — that three different things are on at this instant. It
is the obvious extension and it is left out of v1 because it dilutes a page
whose subject is the moving playhead, and because two of the three lanes would
be about material the page is not playing. Recorded here so it is a decision
rather than an omission.

### The readout

Four cells, all of which move, none of which repeats a gutter:

```
state    playing | behind live | paused | stalled | refused ahead
behind   s   now − the frame on the glass         (band 5–10 s green)
edge     s   now − the newest instant ERR offers  (0.7–3.4 s measured)
your clock s this device against ERR's            (min-RTT, printed not applied)
```

`flipper` prints `window — 120 min`, which is a structural constant dressed as a
measurement and is exactly what "every readout cell must be able to change"
forbids. It is not repeated here; `edge` is the cell that moves.

### The paragraph (draft — one paragraph, three or four sentences, no jargon)

> One ERR television channel on a line whose right-hand end is the present
> moment. The white line is the frame on the glass and the orange one is now;
> the distance between them, about seven seconds, is what a live picture costs
> to reach you, and it is drawn rather than hidden. ERR keeps roughly the last
> two hours, so *Back ten minutes* walks into what has already gone past and
> *Live* returns; the programme names come from ERR's own schedule. The row
> under them is what ERR agreed to hand over when this page asked, two bytes at
> a time.

---

## 8. Asserts

Named, mechanism rather than effect, and every one of them runs on every run —
no conditional asserts, because a total that varies is how four went missing
unnoticed.

### Mechanism — deterministic, no network, at load

| # | assert | detail |
|---|---|---|
| M1 | the line is positioned in the present, not at zero | `deck.position()` inside `range`, printed as a local time |
| M2 | the position domain is absolute wall milliseconds | `deck.range[0] > 1.7e12`, and the strip was **told** `absolute: true` rather than guessing — published on `__demo` so the assert reads the same constant the page handed the library |
| M3 | the axis reads as a clock, not a duration | `formatTime(range[1], MIN, true)` matches `HH:MM` |
| M4 | both ends of the window move | two `rangeGen()` reads a second apart differ, and both `range[0]` and `range[1]` increased |
| M5 | the window keeps its identity while moving | the `deck.range` array is the same object across a `setRange` |
| M6 | the present is not inside the seekable window | `strip.report().wall > deck.range[1]`, and `report().gapMs` is the same number the readout prints — one computation, not two |
| M7 | the transport bar does not stop this deck at its end | the bar was built with `endStop: false` and no end timer is armed |
| M8 | position commands go to the picture, not to the line | the bar's `command` hook is the page's, not `deck.seek` |

### Evidence — needs ERR, fired behind controls

| # | assert | detail |
|---|---|---|
| E1 | the playlist carries a start date | one `EXT-X-PROGRAM-DATE-TIME`, parsed, within 3 h of now |
| E2 | the window is the advertised two hours | `segments × EXTINF` within 1 % of 7200 s |
| E3 | the playhead is behind the present by a live picture's worth | `behind` in 2–20 s (loose: a slow colo must not read as a regression) |
| E4 | the playhead advances with the picture | 1.5 s of wall time moves it 1.5 s ± 0.3, and `master.stats().syncs > 0` |
| E5 | **pausing the picture stops the line and not the present** | `video.pause()` → `deck.playing() === false`, `wallPos()` still increasing |
| E6 | a back-seek is expressed as an instant and lands in the window | asked instant is inside `range`; the element's clock moved by the amount asked for, **read synchronously** |
| E7 | a back-seek is a jump, not a drift | `master.stats().jumps` increased by 1 |
| E8 | returning to live restores the gap | `behind` back inside its band |
| E9 | every probed instant was inside the current playlist | membership, not status code (§4) |
| E10 | the probe stayed under its own cap | issued ≤ `PROBE_CAP` |
| E11 | the programme spans are contiguous and named | `start === previous.end` for every pair, every span has a name |
| E12 | this device's clock is measured against ERR's, not assumed | a number, from ≥ 3 samples, min-RTT kept |

**E6 is synchronous on purpose.** `media.currentTime = x` reflects the target
immediately, so the *request* can be asserted with no wait at all. Whether a
frame from that instant was subsequently *presented* is the effect, it needs a
wait, and **an assert that has to wait is an assert that gets written
tolerantly** (LESSONS #27). The presented frame is therefore **printed and
logged, never asserted**.

**E5 is the closest the harness can get to a stall**, and the plan says exactly
what it is: pausing exercises `media-master` **L5** (a paused element is not a
clock). **L3** — `currentTime` frozen while the element still claims to be
playing — is the real network stall, and it cannot be induced without a fault
injector. Not asserted, and said so on the page.

### Cannot run in the harness, and why

| | why |
|---|---|
| a real stall (L3) | ERR cannot be made to stall from here; CDP `packetLoss` is a no-op in Chrome 151, and netem is not in this harness |
| a real refusal | there was none today across 102 probes — an assert on it would read red for the schedule's reasons, not ours |
| the native path | headless Chrome has no `ManagedMediaSource`, so it always takes hls.js. `demo/verify-safari.mjs` reaches it; `demo/verify-native.mjs` is the iPhone |
| a visitor outside Estonia | the geoblock question of §1. No egress here can ask it |
| dropped frames | a headless machine playing 704×396 drops nothing, so the amber branch of the picture lane never runs in the suite. Assert the *scale exists*, not that it fires |

### Harness mechanics this page has to respect

- **`verify.mjs` stops collecting 400 ms after the last assert**, and its
  first-assert wait is capped at **30 s**. So: all slow work behind **control 0**
  (the only control that gets `settleMs`), and every assert fired from the last
  control, synchronously.
- `settleMs: 20000` — master + a 218 KB media playlist + first fragments + first
  PDT + one 205 KB EPG fetch + a 13-point sweep. `flipper` declares 14000 and
  does less.
- **Controls are pressed in order and the harness sleeps 650 ms between them.**
  `Back ten minutes` and `Live` must therefore each be *complete* in what they
  assert at press time (E6, E8 are synchronous reads); nothing may depend on the
  other having finished.
- **`PROBE_CEILING` in `verify.mjs` is 40**, and its comment names `flipper`'s
  8 × 2. A 13-point sweep plus a 10-probe bisect is 23 more *only during a
  blackout*; today it is zero. Either cap this page at ≤ 15 refusals or raise
  the ceiling **and update the comment to name both demos** — an unexplained
  ceiling is how the next reader mistakes a real outage for expected churn.
- Two hidden traps already paid for and inherited: the profile Cache is cleared
  every run (an engine switch poisons it on a URL that answers 200 with ACAO),
  and `--autoplay-policy=no-user-gesture-required` is what stops `play()` from
  hanging.

---

## 9. Reuse

**(a) import as-is**

| what | from |
|---|---|
| `mount` / `guard` / `el` / `armVideo` / `playOrPrompt` / `matchAspect` | `demo/shell/shell.mjs` |
| `createStripView` (`size: 'auto'`, `absolute: true`, `follow: true`) | `demo/shell/strip.mjs` |
| `createDeck`, `setRange`, `seek`, `sync`, `rangeGen` | `timeline/transport.mjs` — **no library change** |
| `mediaMaster` with `stallPolicy: 'hold'` | `timeline/media-master.mjs` — no change |
| the dual cursor: `armWall` / `wallPos` / the gap band and its label | `timeline/strip.mjs` — no change |
| the `ManagedMediaSource` gate | `demo/flipper/index.html`, verbatim |
| the two-byte Range probe | `demo/flipper/index.html` (`servedStart`) |
| the wall handler — 3 consecutive `fragLoadError`s → `stopLoad()` | `demo/flipper/index.html` |
| min-RTT clock estimation, as a method | `proto/looper/peer.mjs` |

**(b) promote into `demo/shell/` first**

| what | why |
|---|---|
| **`createTransportBar(..., { endStop: false })`** | a live deck has no end. Today the bar arms a one-shot at `range[1]` and, when it fires, **pauses the deck and seeks to the end**. On a live deck that instant is ~7 s after play. §11. Default unchanged |
| **`createTransportBar(..., { command })`** | `{ play, pause, seek(posMs) }`, defaulting to the deck's own. On a media-mastered deck the deck is a *follower*: a control that writes to the follower is undone by the next master tick. The bar's toggle, its scrub, its keyboard table and `hitEnd` all call `deck.*` directly today. §12 |
| **`demo/shell/err-live.mjs`** | the channel table, master → variant → media playlist resolution, the PDT mapping, the two-byte probe and the wall handler — all of which exist inside `flipper` today and all of which this page needs. **LESSONS #30 applies: the promotion is not done until `flipper` imports it too**, in the same phase, with its assert count re-diffed |
| **`demo/shell/err-epg.mjs`** | schedule fetch + the broadcast-day rule (05:45 local, so a 2 h window needs yesterday too) + contiguity check. Small, but it is the only place that knows the day boundary, and a second caller (a radio version, `megatimeline`) is plausible |

**(c) genuinely new — three things, each justified**

1. **The watched-stretch lane.** A span that grows at frame rate while you watch
   and breaks where you seek. `take` draws a take as it records, which is the
   same *shape*, but its parts lie end to end by construction and never break;
   this one is a record of attention rather than of material, and the gaps are
   the point. ~30 lines.
2. **The probe→bisect→region policy.** `flipper` sweeps to find a *starting
   position*; this needs a *drawable region*, which means bracketing a boundary
   to ±1 segment and refusing to fill anything unbracketed. The bisect itself is
   10 lines; the policy is the new thing. ~40 lines.
3. **The clock disagreement readout.** Measured against the `date:` header we
   already receive, min-RTT kept, printed and never applied. ~20 lines. New
   because no demo has ever needed the *visitor's* clock to be right; every
   previous absolute-domain page was either fixed (1965) or 0-based.

Everything else is (a) or (b). There is no new player, no new strip, no new
transport, and no fork of anything.

---

## 10. Phases, with a definition of done each

### P0 — the measurements (DONE, in §1)

Window, PDT, edge lag, servable depth, EPG, the geoblock-flag falsification, and
today's zero-refusal sweep. **Done**: the numbers in §1 exist with dates, and the
two unverified claims are labelled.

### P1 — the line, with no picture at all

Deck in absolute epoch ms; range `[edge − reach, edge]` set at 1 Hz from the
playlist's PDT; strip with the programme lane and the present line; no `<video>`
on the page. Playlist and EPG fetched once each.

**Done when**: the axis reads local clock time, both ends of the range have
moved, the range array kept its identity, the present line advances and the
programme lane is contiguous and named — M1–M6, E1, E2, E11, E12 green, and the
suite's per-demo count recorded.

*This phase is worth having on its own.* It is where the domain, the moving
range and the axis are proved with nothing else able to be blamed.

### P2 — the picture

hls.js on `etv` with `flipper`'s config; `mediaMaster` with `stallPolicy:
'hold'`; the page's own rAF loop calling `master.tick()`, growing the watched
lane, and invalidating the strip while paused. `behind`, `edge`, `state`.

**Done when**: 1.5 s of wall moves the playhead 1.5 s ± 0.3 with `syncs > 0`;
`behind` sits in 5–10 s; pausing the element stops the line while the present
keeps going (E3, E4, E5). And **`node demo/verify-native.mjs` and
`node demo/verify-safari.mjs` both run** — the native branch is unreachable from
`verify.mjs` and has broken three pages before.

### P3 — back, and live

`endStop: false` and `command` land in `transport-bar.mjs`; two controls; the
delta-form seek on both engines; the "window ate your position" log line;
`liveMaxLatencyDurationCount` read from the bundled defaults and asserted.

**Done when**: E6, E7, E8 green; a ten-minute back-seek visibly opens a gap in
the watched lane and the return closes it; **and `flipper` still reports its
committed assert count** after the shell change.

### P4 — the served lane

13-point sweep behind control 0, bisect on any refusal, the four-state ink, the
region only where bracketed, the cap, the wall handler.

**Done when**: E9, E10 green; with nothing refused the lane says so in words and
the region is absent rather than empty; a deliberately broken probe (point it at
a segment one hour older than the window start) draws red and bisects — **prove
the guard fires** by breaking it on purpose once.

### P5 — the promotion

`err-live.mjs` and `err-epg.mjs` into `demo/shell/`; **`flipper` moved onto
them**; `build.mjs` re-run (it enumerates the shell and scans modules, so a dead
import inside one is now refused).

**Done when**: `grep -l` shows two importers for each module, `flipper` and
`now` both green at their recorded counts, and the totals diffed against the
last known figure.

---

## 11. Traps specific to this build

**The transport bar stops a live deck about seven seconds after you press
play.** `hitEnd()` arms `setTimeout(..., timeAt(range[1]) − now)` and, when it
fires, calls `deck.pause()` and `deck.seek(range[1])`. On a live deck the
playhead is ~7 s left of `range[1]`, so the timer is ~7 s out. It is re-armed on
every `transport.onState`, and `sync()` emits **only when the correction exceeds
`toleranceMs`** — so whether it ever fires depends on how noisy the master is.
**An intermittent stop is worse than a deterministic one.** And it gets *more*
likely the better the sync is: a page running a proper rAF `tick()` produces
corrections under 40 ms, which emit nothing, which lets the timer survive.
`endStop: false`.

**The strip stops redrawing exactly when the present must keep moving.** Redraw
gate: `S.dirty || p !== S.pos || (S.wallAnchor && deck.playing())`. Stall or
pause and all three go false, so the present line freezes on screen while
`wallPos()` advances underneath. Fix: `strip.invalidate()` from the page's rAF
loop while `!deck.playing()`. Cheap, and only pays while paused.

**`mediaMaster.tick()` is not called by anything.** The helper's own header says
`function loop(){ requestAnimationFrame(loop); mm.tick(); }` and `flipper` never
wrote that loop — its deck is driven solely by the L4 `timeupdate` backstop at
~4 Hz. Do not inherit the omission.

**`rangeGen` is the strip's span-cache key.** Every `setRange` re-derives every
span lane. 1 Hz, and say so beside the call.

**The full playlist is 217,851 bytes with no delta updates**, re-fetched at
every live refresh (~2 s), and hls.js rebuilds 3750 `Fragment` objects each
time. ≈ 0.11 MB/s of manifest per channel and a main-thread parse whose cost is
⚠️ unmeasured. **Measure it in P2** (`performance` around `LEVEL_UPDATED`) and
print it if it is not small. It is the strongest argument against ever running
more than one channel here.

**403-with-no-ACAO is also what an aged-out segment returns.** Probe only
segments in the playlist you just fetched (§4).

**The broadcast day starts at 05:45 local.** A 2 h window crosses it once a day.
Fetch yesterday's schedule when `range[0]` precedes today's first entry, or the
lane goes empty for two hours a day and nobody sees it for months.

**`?id=` is not settled.** The master mints a 15-digit session id; the 2026-08
research recorded a bare variant URL answering **400**, and today it answered
**200**. Do not depend on either — always enter through the master, which is
what `flipper` does and what the research's own respect note says.

**Timezone.** `formatTime` renders `toTimeString()`, i.e. the *visitor's* local
time, while the EPG's names are Estonian broadcast times. That is the right way
round — "now" must read as the reader's now — but the two disagree for a visitor
abroad, and the page should say the schedule is Estonian time in the lane label
rather than leaving the reader to discover a three-hour offset.

**Do not hammer ERR.** The sweep runs on a press, not on a timer; the bisect is
bounded; the manifest is hls.js's to poll. `max-age=2`, and never poll faster
than the segment duration.

**The usual four**: arm the video inside the gesture (`armVideo`); never let
`play()` gate the work; gate native HLS on `ManagedMediaSource`, never
`canPlayType`; and do not put a `?? 0` anywhere near a number the page prints.

---

## 12. Three existing defects this work exposes

Reported, not fixed here, and **all three are from reading rather than from
pressing** — verify before acting.

**`flipper`'s scrubber probably cannot move the picture.** It mounts
`createTransportBar(d.el, deck)` with the slider enabled *and* a `mediaMaster`
attached. Dragging calls `deck.seek(pos)`; within ~250 ms the master's next tick
sees `|err| > jumpMs` and calls `deck.seek(elementPos)`, putting the playhead
straight back. Its own one-line description says *"the bar scrubs its 2 h
DVR"* — a claim the page may not be able to keep, and nothing asserts it. This
is what the `command` hook of §9(b) fixes for both pages at once.

**`reel` carries a tautological assert.** Its `the axis reads in days, not seconds` line is
`view.strip.report?.().absolute === true || true` — and `report()` does not return
`absolute` at all, so the expression is `undefined || true` and **passes on every
run without testing anything**. It is asserting the one property the page exists
to demonstrate. Exactly LESSONS #27, in the sibling this demo is modelled on;
this is why M2 above is written against a value the page actually hands the
library. One line to fix, and worth fixing before copying the page.

**`flipper` is exposed to the stop-at-end trap of §11** for the same reason
`now` would be. Whether it fires depends on how often its 4 Hz master exceeds
the 40 ms tolerance, which is precisely the sort of thing that works until it
does not.

None of the three is asserted today, in either direction. **Press the scrubber before
believing this paragraph** — LESSONS #26: a second implementation has to be
looked at, not reasoned about, and that cuts both ways.

---

## 13. Rights

Same posture as `reel`, and it is enforced rather than promised.

**What it does**: asks `live.err.ee` for a playlist, hands the URL to a player,
asks the origin two bytes at a time whether it will serve a segment, and reads a
public schedule. Every request goes to ERR directly with no proxy in front of
it, so ERR sees who is asking and can refuse.

**What it must not do, and what enforces it**:

- **no recording.** No `MediaRecorder`, no `fetch` of a segment body beyond the
  two probe bytes, no blob over anything, nothing to R2 or IndexedDB. The demo
  keeps no bytes at all — grep the page for `MediaRecorder|createObjectURL|
  ingest|selfrec` and the answer must be empty.
- **no re-hosting.** No Worker proxy. `workers/view` already proxies the archive
  search; the live path must not join it, both because ERR would lose sight of
  the requester and because a proxy is a redistribution.
- **link back.** The programme lane's rows carry ERR's own `url`; a press opens
  it at ERR.
- **the sweep is a question, not a download.** Thirteen 2-byte requests plus a
  bounded bisect, on a press.

⚠️ The licence conversation with ERR is open (HANDOFF, *Yours alone*) and gates
anything public. `built: true` is a judgement call the session makes, not this
plan: `reel` and `flipper` already stream ERR from `positron.studio`, so this
adds no new class of use — one channel, no copy, on request.

---

## 14. Where it sits

**Act 5, immediately after `flipper`.** The act reads: `reel` (1965, an archive
on a line) → `flipper` (eight live channels, and what ERR refuses) → **`now`**
(one live channel *on the line*, with the present as the right-hand end). Each
one needs the one before it.

**The slug is `now`.** One plain word, no jargon, and it names the thing the
demo is about — the right-hand end of the line. `/now/` reads. It pairs with
`reel` across sixty-one years.

Manifest row:

```js
{ name: 'now', act: 5, built: true, settleMs: 20000,
  one: 'one live ERR channel on a line whose right-hand end is this second',
  tags: ['HLS', 'DVR', 'timeline'] },
```

**How it is different from `flipper`, said on the page**: `flipper` is about
eight channels and switching between them. `now` is about one channel and one
line, where the subject is the playhead advancing and going backwards into what
has already gone past. If a reader cannot tell the two apart, the paragraph is
wrong.

---

## 15. Should it be built as asked?

**Yes.** Everything the request needs is verified to exist:

- a real DVR — 3750 × 1.92 s, and **130.8 min measured servable** today;
- a wall clock in the stream — one `EXT-X-PROGRAM-DATE-TIME` per playlist,
  which is all that is needed since every segment is 1.92 s;
- a wall↔media mapping on **both** engines (`hls.playingDate`,
  `video.getStartDate()`), already used in this repo;
- a moving range the library supports without modification;
- CORS open on masters, media playlists and segments;
- and a programme schedule, gapless and named, that nobody here knew was
  reachable until this morning.

Two amendments to the words, both argued above:

1. **"Playhead keeps moving" becomes "the line keeps moving".** The present
   never stops; the playhead stops with the picture, because its position is a
   claim about what you are looking at. §5.
2. **"Allow back-seeking if possible" is not conditional** — it is the easy
   half. The hard half is *returning* to live and knowing what "live" means as
   a position, which is `liveSyncPosition` and not the newest instant. §6.

One thing this plan will not promise: that a visitor outside Estonia sees a
picture at all. The geoblock question of §1 is open, cannot be settled from
here, and the page must therefore be built so that **being refused is a state it
draws rather than a state it breaks in** — which is what the served lane and
`flipper`'s wall handler are for.
