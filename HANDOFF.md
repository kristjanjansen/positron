# Handoff, 2026-09-25, session 50, a carry-over commit and a five ask round

🔴 **THE SESSION BEFORE THIS ONE WAS CLOSED BY ACCIDENT WITH 8,285
INSERTIONS UNCOMMITTED, AND THAT IS THE FIRST THING THIS SESSION DEALT WITH.**
35 files across the demo pages, the kit and three skills, plus a new plan and
`workers/tapes`, were sitting loose in the checkout. They are commit
`22294ed` now.

⚠️ **IT WAS COMMITTED WITHOUT A BROWSER RUN, AND THAT IS SAID PLAINLY
RATHER THAN IMPLIED.** What was checked before staging: 18 demo pages parse
under `check-html`, and the four no-browser kit tests read `instrument-test`
17 ok, `looper-test` 18 ok, `chords-test` 49 ok, `diagram-test` 93 ok, all
0 failed. **That is not a claim that any page is green.** `/stage/`'s 33/47
from session 49 still stands and nothing below revisits it.

✅ **A PEER SESSION IS LIVE IN THIS CHECKOUT AND WAS ASKED BEFORE THE INDEX
WAS TOUCHED.** MEASURED first: every dirty file was last written between 20:30
and 21:52 and the peer started about 21:58, so none of it was its work. It
confirmed in writing that it holds nothing here. Staged by name, never
`git add -A`, which the repository's own hook refuses anyway.

## The five asks that arrived this session, all collected before any was worked

They are in `BACKLOG.md` under `## Open`, newest first, written the way the
2026-09-19 rule asks: verbatim, with the slug, the file and what is already
known that makes each one non-obvious.

1. **`/nola/`**: the instrument choice becomes the standard patch selector, the
   footer gains a top border and a plate on its left.
2. **`/shape/`**: the left rail goes and the plate moves to the top right.
3. **An edge to edge horizontal separator** on each panel section.
4. **`/knobs/`**: MIDI is always enabled and the plate stays vertical.
5. **`resources` renames to `niemi`**, ASKED A SECOND TIME while the first ask
   sat in this file unworked.

🔴 **AND A DEFECT WAS FOUND IN THE CARRY-OVER WHILE BASELINING, WHICH IS
THE KIND THAT STAYS RED FOREVER WITHOUT ANYBODY READING IT.**
`demo/knobs/index.html:1447` asserts `inst.shown() === 'knobs'`, and
`shown()` returns an **ARRAY** (`demo/shell/panel-layout.mjs:391`). An array is
never equal to a string, **so that assert cannot pass in any circumstance.**
`/shape/index.html:1375` does the same comparison correctly with
`.join(' ')`. ⚠️ **AND ITS FAILURE MESSAGE READS PERFECTLY**, because
`${inst.shown()}` stringifies a one element array to `knobs`, so the line says
*the plate starts at 653.0 and reads “knobs”* while failing. A red
that describes a healthy page is how a real regression gets lost in the noise.

**BASELINE MEASURED before any edit of this round**, `nola shape knobs`
together: **173/179 green, 6 failed**. ⚠️ One other headless Chrome was
running alongside that suite, which the harness reported itself, so it is a
baseline rather than evidence of a regression. Of the six, the relay ones and
`this page makes no sound of its own` are the board being offline, measured
the same day as `no reply in 5 s`, and not code.

---

# Handoff, 2026-09-25, session 49, a bad session with a few real fixes in it

🔴 **READ THIS FIRST: THIS SESSION WASTED MOST OF A DAY AND REAL MONEY, AND THE
WASTE IS THE MAIN THING TO LEARN FROM.** Five hours, five failed attempts at one
control room layout, three innocent things blamed in turn, and two occasions
where the owner was told a page was green when it was not. What follows is what
is actually true now, then what went wrong, in that order.

## What is deployed

**BUILD `0722383-083521-9e49`**, confirmed on the edge.

```sh
node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"
node demo/verify.mjs stage          # 33/47 today, see below
node demo/check-whep.mjs            # is WebRTC media reaching this machine
```

## 🔴 THE VPN. CHECK IT BEFORE DEBUGGING ANY WebRTC FAILURE

It cost most of this session. A corporate VPN passes the WHEP handshake and
drops the media, so **every signalling line reads healthy and nothing arrives.**
MEASURED with no positron page involved, one toggle apart:

    VPN ON    status 201   connection failed      0 frames        0 bytes
    VPN OFF   status 201   connection connected   489 frames  4,428,273 bytes

`node demo/check-whep.mjs` answers it in one command. The rule and the numbers
are in `CLAUDE.md`. **Most work is unaffected**: LL-HLS, the relay, R2, deploys,
wrangler and the pushes are all HTTPS.

## What genuinely got fixed, and is verified

- ✅ **`/llhls/` had been DARK FOR A DAY** and is back: **12/12 green**. The
  RTMPS key rotation of 2026-09-24 never reached the `STREAM_KEY` Worker secret,
  so ffmpeg authenticated with a dead value. The handoff line *"the input UID did
  not change, so nothing in the repository needed editing"* was true and is what
  hid it: **the key is not in the repository.**
- ✅ **`workers/pub`'s WHIP session preflight**, `OPTIONS /whip/<id>` **404 to
  204**. A cross-origin DELETE preflights and only `/whip` was handled, so
  session teardown had never worked from a browser. It survived because the path
  was never driven.
- ✅ **`src/timed-messages.js` cues never fired on WebRTC at all**, silently:
  `playheadTime()` read PDT only, returned null, and `tick()` returned early
  every time. `clock` is explicit now: `pdt` (default, unchanged), `live`, `lag`.
- ✅ **`positron-start`**: Step 4d for an audience that answers back, what
  actually does the publishing, the visitor-default rule, revision stamps, and
  `PARTS.md` with the relay pair verified standalone. **This is the part Taavet
  gets and it is in good shape.**
- ✅ **`plans/plan-stage-hls-webrtc.md`** and five new entries in `LESSONS.md`.

## 🔴 `/stage/` IS THE FAILURE. WHAT IS TRUE RIGHT NOW

**The UI asks were delivered late, partially, and after being reported twice.**
What is on the deployed page today:

- ✅ One bar in the control room: `START HLS` and `START WEBRTC` on the LEFT,
  the timers and `PLAY RECORDING` on the RIGHT, no play glyph.
- ✅ Each transport button is its own stop and relabels to `STOP …`.
- ✅ The archive's own bar and strip are built OFF-PAGE, so the doubling is gone.
- ✅ One diagram. The `Nothing recorded yet` card is gone.
- ✅ The badge says `starting` during the publisher wake.
- ✅ The page is a **pure receiver**: the container publishes both legs and this
  page subscribes. It no longer competes for the WHIP input.

🔴 **AND IT READS 33/47, WITH ALL FOURTEEN FAILURES DOWNSTREAM OF ONE.** The
check polls for `phase === 'live'` after pressing and the start does not land
inside the window. **The show does start**: the stop assert a few lines later in
the same run reads *"the page is live and the button reads STOP WEBRTC"*.
Probed headful: `pc connected` at 27.9 s, `picture 1280x720`, recorder running.

🔴 **THE WAIT CANNOT BE WIDENED, AND THIS IS THE NEXT THING TO FIX.** This page
HOLDS its asserts and flushes them only when `checks()` returns, so every second
spent waiting delays all 37. Tried at 28 s, 45 s and 80 s: each one pushed the
flush past the harness's patience and the page reported **2 asserts instead of
37 while the suite printed a confident 12/12 GREEN**. `settleMs` was raised from
25000 to 75000 and does not help alone, because `verify.mjs` caps the
first-assert budget at `FIRST_ASSERT_CEIL = 30000`.
✅ **GRADE THE HLS LEG INSTEAD.** It comes up in seconds, needs no container
wake, and exercises the same recorder, archive and strip. That is a restructure
of the check block and it is the single highest-value thing left.

## Still open on `/stage/`, reported and NOT done

- ⚠️ **A STALE QUESTION APPEARS ON LOAD**, `KAS SA OLED TEINUD ÖKOPATTU?`, on a
  page that is `OFF AIR`. Reported with a screenshot and NOT diagnosed. The room
  default at `demo/stage/index.html:67` is a FIXED name, `stage-demo`, so every
  manual probe and every headful open this session joined the room a visitor
  joins.
  🔴 **AND THE HALF OF THIS LINE THAT BLAMED THE HARNESS WAS WRONG,
  CHECKED 2026-09-25.** It read *"`demo/verify.mjs` gives every other page its
  own room per run and this page's default is shared with the public"*, which
  would have sent the next reader to the harness. `demo/verify.mjs:648` reads
  `const own = t.room === 'fixed' ? '' : ...`, and `stage` is NOT `room:
  'fixed'` in `demo/manifest.mjs`, **so the suite already gets
  `stage-test-<hash>` and has never touched `stage-demo`.** The probes did.
  A question belongs to a show, and an off-air page has no show, which is where
  to look.
- ⚠️ **The side borders on the active tab**, asked about with a crop of
  `CONTROLROOM` showing a vertical rule each side. Not looked at.
- ⚠️ The film still starts with the show, which was a reversal forced by removing
  its play button. If a film control comes back, revisit it.

## What went wrong, so it is not repeated

1. 🔴 **A GREEN PAGE WITH NO COVERAGE WAS USED AS THE CONTROL FOR HOURS.**
   `/webrtc/` reads 8/8 and contains **two** page asserts, both the shell's. Its
   own checks sit behind a connection that never happened. The assert count was
   printed on every one of those runs. `LESSONS.md` #114.
2. 🔴 **A PAGE WAS SHIPPED ON A GREEN THAT WAS A MEASUREMENT OF A WARM
   CONTAINER**, and reported as fine twice. Cold it was 37/49. `LESSONS.md` #119.
3. 🔴 **REPOINTING A CONTAINER IS NOT MERGING ITS CONTENTS.** One blanket replace
   of `tabs.panel('archive')` moved a bar, a strip and a diagram into a panel
   that already had its own. `LESSONS.md` #116.
4. 🔴 **`createTransportBar(parent, …)` APPENDS TO THAT PARENT.** Deleting the
   `createGlue` line removed nothing, and the doubling survived TWO reports
   because of it. The first argument is a mount point, not a hint.
5. 🔴 **UI WORK WAS BLOCKED BEHIND A DEBUGGING RABBIT HOLE.** The layout was
   finished in the working tree while hours went into a timing problem that was
   not a UI problem. Said plainly by the owner: *"where is ui changes. your whep
   analysis blocks them."* **Ship the thing that is done.**
