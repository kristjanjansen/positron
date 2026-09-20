# archive/demos: retired demo pages

One file per page, kept verbatim and named `<slug>-index.html`. Nothing in here
is loaded, imported or deployed. `workers/view/build.mjs` enumerates `demo/`,
and these files sit outside it, so a slug archived here 404s on
positron.studio and any link anybody kept is dead.

A page is archived rather than deleted when the code still answers a question
somebody may ask again. It is not a fallback and must not be wired back in: a
page here has no row in `demo/manifest.mjs`, so no harness opens it and nothing
grades it any more.

## `seek-index.html`, removed 2026-09-16

Removed on instruction: *"rm seek demo"*. No fault was reported and none was
found. It was `/seek/`, act 3, created 2026-09-04, and its line on the front
page read *"seek inside that recording; the fold at any position must be
exact"*.

### What it was

The page about going back. It played the same 190 s show `/replay/` plays,
off R2 over HLS (`ARCHIVE.hls` in `demo/shell/archive.mjs`), with the eight
operator cues that show was recorded with, and it asked the timeline one
question over and over: **which cues have happened by the position the playhead
is standing at?** Every answer was compared against counting the cues by hand.

Two controls asked it two ways.

- **`Ask "which cues by now?" at 24 points`** called `deck.reduceAt('cue', t)`
  one millisecond before, exactly on, and one millisecond after each of the
  eight cues, without playing anything. Twenty-four asks, and a single wrong
  count failed the run.
- **`Jump to 5 places and re-ask`** seeked to 100, 20, 165, 5 and 130 seconds,
  waited 700 ms for the picture to land, and asked again at each stop. The
  order is deliberately not monotonic: two of the five jumps go backwards.

The failure it existed to catch was a **retroactive burst**: a cue actuating
long after its own position, because a seek replayed the backlog instead of
folding it. Its adapter measured how late each fire was against the element's
own `currentTime` and counted anything over 1.5 s.

Eleven asserts. Its `readout` was `jumps / asked / by now / wrong`, and
`by now` was the one figure on it that moved while you watched, stepping as the
picture passed a cue and jumping when you seeked.

### What went with it, and what did not

It also graded the transport bar's **loop button**, driven through the button's
own handler rather than by setting state: two presses mark a loop, the playhead
comes back when it passes the end, a third press takes it off. A comment in it
said *"exactly one page has to prove it works"*, and that stopped being true
before it left. `replay`, `radio` and `tapes` all press `pressLoop()` through
`bar.api` and assert on what happens, so the shared loop is still graded in
three places.

The `ManagedMediaSource` gate is the other thing it carried. CLAUDE.md names
`replay`, `seek` and `flipper` as the three pages that got it on 2026-09-06
after all three ran `video.src = <m3u8>` on a Chrome that cannot play it, dead
picture and green suite. Two of the three are still standing and still gated.

## `earshot-index.html`, retired 2026-09-16

Four questions about sound in a headset that nobody here had measured: whether
the audio keeps running once you are inside, what the sample rate and the
output delay read in there, whether the browser still turns compressed audio
into samples, and whether the main thread keeps servicing audio while it draws
ninety times a second. The window readings were the control.

It got four answers on a real Quest, 68 s and 3322 frames, and that is why it
is gone rather than in spite of it: an instrument built to settle one thing is
furniture once the thing is settled. The numbers are in CLAUDE.md under WebXR
and the long note is in `demo/manifest.mjs`. It touched no third-party mount,
so "the headset went silent" and "somebody else's station was down" could never
be the same observation.

## `rack-index.html`, retired 2026-09-11

⚠️ **This is not what `/able/` is now.** The slug is live again with a
different page, created 2026-09-12, which PLAYS Ableton Live from the browser.
The file here is the page that held the slug before it.

It asked a Mac in a studio whether it was actually set up: not whether it was
switched on, but whether every link held. Live up, answering remote control, an
instrument on the track, armed and unmuted, and a note sent to it coming back
as real sound. The last check crossed the whole chain by holding a chord while
recording the machine's own output and comparing it against silence recorded
seconds earlier. If nobody answered, it said so rather than showing an empty
list that looks like a pass.

Pulled before the M1 and Live side was rearchitected, rather than left pointing
at a design that was about to change. What it proved is worth keeping: the
chain ran end to end, from `midisend` through IAC to Live to an Arturia
Stage-73 V2 to BlackHole, with a held chord reading -29.1 dB peak against a
-91.0 dB silence baseline, 61.9 dB of separation. Its checkup also found the
output clipping at full scale, which nothing else had noticed. `rig/m1/` and
`plan-rack.md` hold the rest.
