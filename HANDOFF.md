# Handoff, 2026-09-18, session 33

**DEPLOYED AND CONFIRMED ON THE EDGE: `BUILD 561c9d6-095201-0b2c`.** Confirmed
by reading the stamp back off `positron.studio`, not by the deploy saying so.
The mail worker is live as version `50a78731` at 100%. 25 commits, working tree
clean, 347 unpushed.

**The board is the one thing not deployed**, and it cannot be from here: it
answers over the relay and refuses ssh. `cd rig/box && ./push.sh`.

## `/stage/` is a real virtual stage now

`plan-stage-live.md` §7, built on instruction with the M1 and the Raspberry Pi
left out. **28/28**, up from 21, stable across repeated runs.

One press negotiates a peer connection, records the track that came back,
resolves a real duration and hands it to the archive, where the questions are
spans whose width is how long each one stood and the last is left open because
nothing overrode it. A question travels the relay and comes back as a lane, so
the local case and the remote case are one code path.

**https://positron.studio/stage/** · an ERR clip behind the picture with
`?bg=op-489&from=11:01&to=15:39` · `?live=1` for the real Cloudflare leg ·
`?r2=1` to store it and prove it readable.

## 🔴 Three things that are TRUE and unwelcome, none of them hidden

**NO PICTURE CROSSES A WEBRTC LEG IN THIS SANDBOX.** MEASURED: a local loopback
gathers exactly one host candidate, `iceGatheringState` reaches `complete`, and
`iceConnectionState` then sits at **checking** for ever. UDP connectivity checks
do not complete here. So the page records the canvas instead and SAYS SO in its
log, and the identity check asserts the truth of that label rather than assuming
either path.
⚠️ **THIS ALSO EXPLAINS `/show/`**, whose `check` handler was reported as never
reaching. Same in-page loopback, same wait for a leg that cannot connect. Nobody
had joined the two facts.

**THE ARCHIVE'S PLAYHEAD MOVES AND ITS PICTURE DOES NOT.** MEASURED: seeking
from 0.794s to 3.177s moves `currentTime` to both positions EXACTLY, and
`readBurnedFrom` returns the identical millisecond at both. The cause is the
file: **MediaRecorder WebM carries no cues**, so a browser reports the position
it was asked for and keeps the frame it already had.
`proto/selfrec/indexer.mjs` is the answer and is already written.
**`plan-stage-live.md` §10.6 is NOT met**: the check grades the playhead, which
is the half the page is responsible for, and the page logs the other half in
words.

**A THREE HOUR SHOW BREAKS THE R2 PATH BY 45x.** 3h at 800 kbit/s is **1.08 GB**
against a 24 MiB session cap, and that tier's 6 hour TTL would delete the show
three hours after it ended. `selfrec` is the right worker and the original ask
already described it: a client-chosen key is a stable URL, which is *"single
feed and single file, what you can overwrite"* word for word.
🔴 **THE BITRATE IS THE DECISION NOBODY HAS MADE**, and everything else follows
from it. 300 kbit/s is 415 MiB, 800 is 1.08 GB, 2 Mbit/s is 2.70 GB. The table
and the playback consequence are in `BACKLOG.md`.

## What else landed

**The whole backlog was audited against the code**, after three entries went
stale in one day. **Sixteen were already finished.** The count was wrong too: 57
was never right, because the `### XR` block is ONE request whose 48 sub-items
are ordinary bullets at column zero. **50 are genuinely open.**

**Forty pages stopped running their checks at the people reading them**, and the
load-bearing fix was in the harness: `verify-gl.mjs` and `verify-quest.mjs`
never appended `selfcheck=1`, so `/videoradio/`'s checks had been running
NOWHERE for two sessions. `/floor/` was fetching ERR and playing a film on every
visit.

**`/tapes/` has a stand-in**, `demo/fake-tapes.mjs`: 38/38 with the only hosts
contacted being the dev server and it.

**The mail parser got the tests the classifier already had.** 75/75, up from 51,
with both real Gmail messages as byte-exact fixtures. RFC 2047 subjects and
bodies decode, and the verdict now names the stamp that decided it.

**The board can be diagnosed from outside the building**: `jack.graph` reads and
changes nothing, `jack.rebuild` is a diff rather than a teardown. 92/92, up from
67, and unverified on hardware.

**`research/err-stage-theatre-2026-09-18.md`**: 10,185 catalogue rows, 1928 to
2026, **161 requests and no media of any kind**.

## Rules that cost real time this session

🔴 **A SEARCH THAT COMES BACK EMPTY IS EVIDENCE ABOUT THE SEARCH FIRST.** Nine
em dashes were written as escapes, so every grep for the character answered
clean about files that had them. That is the `timeline/transport.mjs` NUL lesson
in a new costume, and it will keep arriving in new ones.

🔴 **A COMMENT IS NOT A GATE, AND A SETTING IS NOT AN EFFECT.** `/stage/`'s
checks CLAIMED to be gated in a comment and were not, so every visitor's control
room went full screen a second after load, which is the `/videoradio/` defect
the comment itself cites. And `how: true` passed inside the spec instead of the
options is a setting that reads as correct and does nothing, which the same page
had already paid for once with `clock: false`.

🔴 **A SELECTOR THAT MATCHES NOTHING IS SILENT.** `/items/`'s fixed-height rule
named a class the page stopped producing when it moved to `createTable`, and it
was written TWO DAYS BEFORE the ask it appears to answer, so the code read as
done and the entry read as open and both were right.

🔴 **WHEN A CHECK FAILS, SUSPECT ITS ROUTE BEFORE THE PAGE.** The archive seek
took three wrong diagnoses: the deck is a FOLLOWER so `deck.seek` does nothing;
a stale `seeked` from `resolveDuration` resolved the wait early; and only then
did the real limitation appear. A check that drives a page by a route the page
forbids is not testing the page.

⚠️ **`verify.mjs` STOPS COLLECTING THE MOMENT THE COUNT IS UNCHANGED FOR ONE
400 ms TICK**, not 4.8 s. A drill that works for twelve seconds had 1 of its 7
asserts collected. On a page with no controls row the way out is to HOLD every
assert and emit them together, because the harness waits while the count is
still zero.

⚠️ **THREE RENDERERS OF ONE PICTURE AND NOTHING COMPARES THEM.** The ffmpeg
copies turn a canvas baseline into a box top with a hand typed offset, and when
the number shrank from 84 to 64 the offset stayed: the container drew it **25 px
too low** and nothing said so, because that output is only ever seen inside a
container.
