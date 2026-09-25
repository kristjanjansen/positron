# Handoff, 2026-09-25, session 50, the dead buttons and a day of the wrong fix

🔴 **READ THIS FIRST: `/stage/`'s TWO MAIN CONTROLS HAD BEEN DEAD, AND EVERY
HOUR SPENT ON TIMING WAS SPENT AGAINST THAT.** Session 49 recorded 33/47 with
fourteen failures and a confident diagnosis: the check presses START, polls for
`phase === 'live'`, and the start does not land inside the window. The wait was
widened to 28 s, 45 s and 80 s, `settleMs` was tripled to 75000, the page was
rewritten five times, headless Chrome was blamed, a VPN was blamed. **The press
did nothing.** `demo/shell/transport-bar.mjs` binds `extras` buttons with
`x.onClick?.(b)`; this page passed **`onPress`**. `?.` on an absent handler is
silent, so a misspelled name is indistinguishable from a button with nothing
wired to it. Of the eight pages that declare `extras`, only this one passed
`onPress`, which is why nothing else ever showed it.

## What is deployed

**BUILD `61ad3b6-142325-6c61`**, confirmed on the edge, `workers/view` only.

```sh
node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"
node demo/verify.mjs stage           # 47/48 before the last few UI changes
node demo/check-whep.mjs             # THREE outcomes now, see below
```

🔴 **AND `workers/pub` IS NOT DEPLOYED. IT CANNOT BE, FROM THIS MACHINE.** The
film swap and the burn removal are written, parse, and sit in the working tree
unbuilt. See the blocked section before trying.

## 🔴 THE VPN RULE IS WITHDRAWN AS AN EXPLANATION, AND THE TOOL WAS LYING

**The owner says there is no VPN on this machine, in those words.** And
`demo/check-whep.mjs` blamed one anyway: its early return answers a WHEP POST of
status >= 300 with `nothing is publishing to that input`, and its verdict block
then printed a confident **CHECK THE VPN FIRST** regardless, because it only
tested `framesDecoded > 0`. It has three outcomes now and exits 2 on
`INCONCLUSIVE`.

✅ **WITH A PUBLISHER AWAKE, WHEP MEDIA REACHES THIS MACHINE:** `status 201`,
`connection connected`, **389 frames, 3,554,870 bytes**. No VPN, no code change.
Holding a socket to `wss://pub.positron.studio/watch` is what wakes the
container, and **nothing about WebRTC is measurable until it is awake.**

🔴 **SO `WHEP DOES NOT CONNECT IN THIS HEADLESS CHROME, FOR ANY PAGE` IS FALSE.**
The VPN table in `CLAUDE.md` was measured one toggle apart and is kept; what does
not survive is using it as the explanation for any red on this desk.

## 🔴 `/webrtc/`'s CHECKS WERE UNREACHABLE ON EVERY PATH, WHICH IS NOT WHAT WE SAID

Session 49 recorded that its own checks *"sit behind a connection that never
happened"*. That was the comforting version. **`d.run('check')` sat after a `for`
loop whose success branch `return`ed and whose failure branch `return`ed**, so no
route through that handler ever reached it. The connection DID happen and the
checks were skipped anyway. One character, `return` to `break`, plus an assert
where a bare `d.log` used to swallow an unreachable subject.
✅ **MEASURED after: `page asserted something` went 2 to 10, and `/webrtc/` reads
16/16** with `peer connection connected`, `a VIDEO track arrived`, `frames are
actually RENDERED 1280x720` and `element is playing` among them.

## What got fixed on `/stage/`, all deployed

- ✅ **Both start buttons work at all.** `onClick`, and `transport-bar.mjs`'s
  `extras` now accepts `onPress ?? onClick` so the next page cannot pay for it.
- ✅ **hls.js was never loaded on this page**, so once the button worked
  `START HLS` threw `HLS is not supported in this browser`. Injected on demand,
  because the file is 618,156 bytes and a WebRTC visitor needs none of it.
- ✅ **The badge moves on the HLS leg**, which it never did, and says `STARTING`.
  ⚠️ `presence.mjs` accepts exactly `online, checking, coming, offline, unknown`
  and THROWS on anything else: `setBadges('starting')` threw inside `startHls`,
  which `toggleTransport` does not catch, so the button did nothing and said
  nothing. `coming` with a page-level `says` override is the supported path.
- ✅ **`CHECKING` and `STARTING` read the same word**, asked for: the two states
  stay, the visitor stops learning the difference.
- ✅ **A badge that gave up while a picture was playing.** `waitForFirstFrame`
  resolves `frames: false` on TIMEOUT and 20 s is about the container's cold
  wake, so it expired a moment before the frame landed and said `checking` for
  ever. Raising it would only move the race; it keeps looking, bounded.
- ✅ **The room is private per load**, `stage-<6 chars>`, with a share URL
  logged. The stale question was a STRANGER typing into the shared `stage-demo`.
  There is no history: `workers/relay/src/index.js` is stateless fan-out and
  sends a joiner nothing.
- ✅ **The prefilled sample question is BACK**, on instruction, which is right:
  emptying it was the wrong half of that fix.
- ✅ **One footer on the video panel**, the glued film bar and its `22:11.850`
  clock gone. `soloFooter` makes a later `glue()` THROW rather than silently
  stacking a second footer, which is how the doubling survived two reports.
- ✅ **The question is on the picture**, where subtitles live. Contrast against
  `--fg` goes from **1.25:1** on a white frame to **15.77:1**.
- ✅ **The picture follows the tab.** One `<video>`, moved, because a second
  element on one source is a second Stream meter for one picture.
- ✅ **The timeline no longer runs before air.** `showDeck.play()` was the third
  line of `startShow` and counted through the whole wake.
- ✅ **Shimmer on the pressed transport button until on air**, plus `aria-busy`.
- ✅ **A `Clear` button under the control room timeline**, disabled when there is
  nothing to clear. Reverses *"Ok no clear. New run clears"* of 2026-09-19, and
  that reasoning is kept in the file.
- ✅ **A show lane that GROWS** rather than claiming a nominal length, and **no
  question lane until a question is asked**. Both are the same defect the owner
  removed in September: a bar for a thing nobody did.
- ✅ **The tab side borders were a CLIPPED FOCUS RING.** `.pos-tabs-bar` is
  `overflow-x: auto`, which forces the other axis to `auto`, so the row clipped
  the `:focus-visible` outline's top and bottom and left its two verticals.
- ✅ **No uppercase on BUTTONS only.** It went too wide first, on a preview I
  wrote badly, and was corrected: labels, readout keys, badges, tags and the
  presence word are back in caps; the transport bar, tabs, Feedback, the back
  link and the tap button are sentence case with real hover and press states.
- ✅ `Play recording` is an ordinary word button, not a 15 px glyph box.
- ✅ **`demo/verify.mjs` allows the blob 416** from `resolveDuration`'s seek to
  1e6, scoped to `blob:` so a real range bug still goes red.

## 🔴 A REGRESSION I SHIPPED AND THEN FIXED, AND THE PLAN PREDICTED IT

`showPictureOn` re-appended the **dead** live element over the archive
recording, because since the Archive tab went the archive panel IS the control
room panel, and `audVideo` had five references and **no assignment back to null
anywhere**. Reported as *"i see not recording lane nor playback does anyting"*
with `Play recording` enabled. One cause, two symptoms, neither of them where
the cause was. Guarded on `archiveMedia`, and the pointer is cleared on stop.

## What is open

- 🔴 **THE HLS LEG STILL DOES NOT RECORD.** Plan in full at
  **`plans/plan-stage-hls-record.md`**. Two things block it, not one: there is no
  track to record, AND **`startHls` never sets `phase`**, so `stopShow()`'s
  `if (phase !== 'live') return` makes the whole archive chain unreachable.
  🔴 **AND STEP 1 IS A TRAP THAT MUST LAND FIRST**: the moment HLS sets
  `phase = 'live'`, pressing `Start WebRTC` will silently do nothing, because
  `startShow` opens `if (phase === 'live' || starting) return`. Buttons relabel,
  no show, no error, and fourteen asserts go red about one guard.
  ✅ **MEASURED on `/llhls/`: `video.captureStream()` works in Chrome,
  `track.readyState` stayed `live` and `rec.state` `recording` across 47 s,
  pieces 24 to 44.** ⚠️ **Resolution never changed in that run, so the question
  that chooses route 1 from route 2 IS STILL OPEN.** Force a switch with
  `hls.currentLevel` and read what `resolveDuration` says about the blob.
  ⚠️ Safari is unmeasured: `safaridriver --enable` needs an admin password
  nobody typed. If WebKit has no media-element `captureStream`, the canvas route
  does not rescue it either, and the page must SAY so (assert 8 in the plan).
- ⚠️ **The test pattern asks are not started**: ABSOLUTE and LOCAL each beside
  their own number, stacked, smaller digits, drop the `00:01:43.967 / 3119` box,
  nicer hues. That is `drawFilters()` in `workers/pub/container/server.mjs`, so
  it is blocked on the same thing as the film.
- ⚠️ **16 hardcoded ALL CAPS labels in six pages** were swept (kit, making and
  pack tabs, `SAVE TAKE` on evo and nola). 48 more caps strings are acronyms,
  units and model numbers where caps is correct English.

## 🔴 BLOCKED, AND IT IS THE MACHINE RATHER THAN THE CODE

**`workers/pub` CANNOT BE DEPLOYED FROM THIS MAC.** Measured today, in this
order, each one a fresh-clone gap nothing in the repository mentions:

1. **No Cloudflare credentials at all.** `.env` is gitignored so it never
   arrives, and `~/.wrangler` did not exist. Fixed with `npx wrangler login`.
2. **`workers/pub/node_modules/` is gitignored**, so `@cloudflare/containers`
   could not be resolved and the bundle failed. Fixed with `npm install` there.
3. 🔴 **THERE IS NO DOCKER ON THIS MACHINE.** `which docker`, `which podman`,
   no Docker.app, no OrbStack, no Rancher. `wrangler.jsonc` has
   `"image": "./container/Dockerfile"`, so wrangler builds locally, and it fails
   with *"The Docker CLI is needed to build the configured image"*.
   ⚠️ **`--containers-rollout=none` IS NOT A WORKAROUND** for container CODE: it
   deploys the Worker and leaves the image alone, so `server.mjs` never changes.

**So every container deploy in this project's history happened on m2**, which is
also why the tooling above was never installed here. The three routes are
**Cloudflare Workers Builds** (connect the repository, build in the cloud, which
fixes it for both machines), **deploy from m2**, or **install Docker here**. The
first is the one worth doing: right now the publisher can only be changed from
one laptop.

## The rig, and two machines

✅ **The rack rig was refreshed and is running**, launchd
`studio.positron.rack-agent`, room `m1-1`, audio grant still allowed.
`audiotap exited (1)` is Ableton Live being closed and is NOT a fault.
🔴 **`audiotap` WAS DELIBERATELY NOT REBUILT.** The 16-line source diff is pure
comments and the compiled `__TEXT,__text` is byte-identical across three builds;
a rebuild would void a TCC grant keyed to an absolute path AND a 40-byte cdhash,
and a refused tap emits correctly clocked SILENCE that every layer above reports
as success.
⚠️ **`rig/m1/taptest.sh` existed on disk and in NO COMMIT** until today.
⚠️ **`.gitignore` covered none of the three compiled binaries.** Now
`rig/m1/bin/`.
📄 **`plans/plan-two-machines.md`** for the m1/m2 design. Its sharpest finding:
`rig/audit.mjs` tests those paths with `test -e`, so it would have printed
`ok ok ok` over a rig two renames behind for a fortnight. **An existence check
on a hand-copied file is a check that a hand copy once happened.**

## What went wrong, so it is not repeated

1. 🔴 **A CAPABILITY IS NOT A CHANGE.** An agent built `soloFooter`,
   `slots.caption` and `barButton`, reported correctly that the page had to be
   wired to them "by somebody else", and I sent the next agent after the check
   timing instead. So for forty minutes the plumbing existed and the page called
   none of it, while the owner looked at `START HLS` shouting and
   `PLAY RECORDING` clipped to `PL RECOR`. The reply was *"i do not see ui
   fixes"* and *"how you spent 40min again?"*. **This is now a rule in
   `CLAUDE.md`: finished means deployed, and nothing is done until the
   screenshot changes.** It is session 49's failure 5 arriving one layer up.
2. 🔴 **I SCOPED A DECISION WRONGLY AND THE OWNER AGREED TO MY ERROR.** The ask
   was *"for the buttons"*; the preview I wrote listed tabs, buttons, badges AND
   readout keys, so a presence badge was swept in on the strength of my own
   wording. **An agreed decision can still be the wrong one when the option was
   described wrong.**
3. 🔴 **THE DIAGNOSTIC WAS THE THING WITH NO COVERAGE.** A green page with no
   coverage is the worst control, and this time it was `check-whep.mjs` itself.
   **Check that a check can fail.**
4. ⚠️ **AN IDENTICAL LINE IN TWO LEGS BURNED TWO EDITS.** Both transports carry
   a byte-identical `setBadges(seen.frames ? 'online' : 'checking')`, so a
   uniqueness assertion failed twice. Anchor on the surrounding comment.
5. ⚠️ **LINE NUMBERS IN A FILE UNDER EDIT ARE WORTHLESS.**
   `demo/stage/index.html` grew 40 lines while an agent read it and its own
   greps disagreed with its own reads. Anchor on names.
