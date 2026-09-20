# positron

Live at **https://positron.studio**. 47 shelled demos of 49 rows
(2026-09-20, counted from `DEMOS` rather than remembered). `making` and `held`
are the newest, both 2026-09-19. `making` is the MIMproject archive: the
recordings and the pictures that outlived the project's own website, on two
tabs. ⚠️ THE FIGURES HERE READ `43 of 46` AND `tapes is the newest` FOR FOUR
DAYS AND THREE DEMOS, which is the drift this file's own rule is about, and the
count takes one command: `node -e "import('./demo/manifest.mjs').then(m =>
console.log(m.DEMOS.length))"`. The lengths are measured and live in `corpus.json`. ⚠️ **`radio1965` IS NOW `radio`, RENAMED 2026-09-16 ON INSTRUCTION.**
The slug, the directory and every reference moved together; the deployed
`/radio1965/` is GONE, so any link anybody has kept 404s and a redirect has not
been written. The line that stood here before said the slug was fixed and not to
re-open it, and that was about an unasked-for rename to `vain` on 2026-09-15
which was reverted within the hour. An instruction supersedes it. ⚠️ Only
`archive/` still says `radio1965`, on purpose: an archive records what was there.
⚠️ **AND `box` IS NOW `keys`, RENAMED 2026-09-16 ON INSTRUCTION, THE SAME DAY
AND THE SAME WAY.** The deployed `/box/` is GONE and no redirect was written;
119 references in 30 files moved. ⚠️ **`rig/box/` DID NOT MOVE THEN AND HAS
MOVED NOW: IT IS `rig/board/`, RENAMED 2026-09-20 ON INSTRUCTION** (*"and in
general change the lingo from box to board"*). The line here used to say the
BOARD was still the box and that `rig/box/` must never move; an instruction
supersedes it, the same way `radio1965` and `box` superseded their own rules.
**777 occurrences moved in 110 files**: the directory, `board.mjs`, the wire
verbs `board.hello` / `board.alive` / `board.ping` / `board.pong` /
`board.error`, `positron-board.service`, `/opt/positron-board`,
`/etc/default/positron-board`, `BOARD_NAME` / `BOARD_USER` / `BOARD_AUDIO`,
the JACK capture client `posboard`, and the prose.
🔴 **WHAT DID NOT MOVE, AND THIS IS THE `held` LESSON AGAIN**: `diagram.mjs`'s
`BOX_PAD_X`, `BOX_FS`, `BOX_ALIGN`, `BOX_TINT`, `BOX_MIN_W`, `BOX_MAX_W`,
`BOX_MAX_W_COL`, `BOX_TARGET_W` are about **a box in a picture**; `box-shadow`
is CSS; and `archive/` keeps every `box` it ever had, because an archive
records what was there. **The sweep matched the machine's names, never the
word.**
⚠️ **`rig/board/listen.html` IS GONE AND THIS SENTENCE SAID IT WAS STILL THERE.**
It was the example named here of a page that belongs with its hardware, and it
was RETIRED with `/keys/` on 2026-09-17; it is at `archive/keys/listen.html` and
`LAYOUT.md` rule 2 no longer has a live example. **The rule it illustrated is
untouched**: a page that drives hardware does not go under `demo/`, because that
invites `built: true`, which puts a shared Raspberry Pi in another building into
every run of the suite. Found 2026-09-18 by auditing the backlog, which is the
second time in one day that a confident sentence in a file like this outlived
the thing it described.
🔴 **AND `held` IS NOW `weight`, RENAMED 2026-09-19 ON INSTRUCTION, AND THIS ONE
IS NOT LIKE THE OTHER TWO.** *"name the demo held, rename old held to weight"*,
because the NAME is being given to a different demo. So the old URL is not a
dead link: `/held/` will be a live page showing something else, and a reader
with a kept link arrives somewhere plausible and wrong with nothing to tell
them. A 404 at least says no. ⚠️ **THE SWEEP MATCHED THE URL FORM `/held/` AND
THE SLUG, NEVER THE WORD**, which is `rig/board/` again and was the whole risk:
**330 files hold the string `held`** because it is ordinary English, and a held
chord, a held note and a button already held are all untouched. About 136
occurrences moved. ⚠️ **VERBATIM QUOTATIONS WERE LEFT AS THEY WERE SAID**, and
`demo/weight/index.html` carries one line above its `mount()` saying so, because
rewording somebody's report to match a later decision stops it being a
quotation. ⚠️ **`/kit/`'s CARD WAS THE ONE STRAGGLER AND IS FIXED**: it carried a live
`href: '/held/'`, which after this rename does not 404, it opens a DIFFERENT
PAGE and says nothing about it. That is the one failure mode neither earlier
rename here produced, because `/radio1965/` and `/box/` both simply died. A
stale link is louder than a dead one.
⚠️ **AND THAT BOARD HAS ONE INSTRUMENT SINCE 2026-09-16.** FluidSynth and hexter
are at `archive/box-fluidsynth-hexter/`, out of `jacksynth.mjs` and out of
`rig/audit.mjs`; a board asked for either answers `unknown source`. There is ONE
jackd, ONE capture and ONE room on it, so an instrument picker was a control
that took the sound away from somebody in another building, and it did: `/knobs/`
was found refusing to start because somebody had pressed `sampled`.
⚠️ The suite total that
used to sit here was removed rather than updated: it was stale for two sessions, and a count nobody re-measures reads as
a fact. Run `node demo/verify.mjs` for the current one. ⚠️ A red run is not automatically a
regression here: `now`'s asserts go red when ERR refuses its own live edge (one
403 probe separates the two), and a demo that needs something off this machine
goes red when a leftover Chrome of mine is holding relay sockets — **run the
failing demos ALONE before believing the suite**. `scene` is the first WebXR page;
`node demo/verify-quest.mjs` drives it on a real Quest over adb, and
`--self-test` proves its headset guard discriminates with no device attached. The front page is
ordered NEWEST FIRST — `DEMOS` is still the story order and `byNewest()` copies
it, because the index answers "what is new here?" and the sequence answers
"where do I start?". Read
`HANDOFF.md` for current state, **`BACKLOG.md` for what has been asked for and
not yet done**, `LESSONS.md` for why the rules below exist,
`PROGRESS.md` for what was measured when, and **`LAYOUT.md` for where a new file
goes** — including the two renames that were priced and rejected, so they are
not re-litigated.

## Pushing needs the PERSONAL GitHub account, and it is not the active one

🔴 **`git push` ANSWERS `Repository not found`, AND THAT IS AN AUTH FAILURE
WEARING A 404.** Two accounts are logged in here — `Kristjan-Jansen_enefit`,
which is ACTIVE, and `kristjanjansen`, which owns `github.com/kristjanjansen/
positron`. GitHub returns 404 rather than 403 for a private repo the caller
cannot see, so the message says the repository does not exist when what it means
is that this token may not look at it. It cost most of a session, spread over
three sittings, because "not found" reads as a wrong remote URL or a deleted
repo, and both were checked before the accounts were.

```sh
gh auth switch --user kristjanjansen     # the account that owns the repo
git push origin HEAD
gh auth switch --user Kristjan-Jansen_enefit   # put it back, ASKED FOR 2026-09-17
```

⚠️ **SWITCH BACK.** The active account is machine-wide and the work one is the
default for a reason; leaving it on the personal account changes what every
other repository on this laptop authenticates as.
⚠️ **THE KEYCHAIN SHORTCUT DOES NOT WORK HERE AND WAS TRIED.** Storing the
personal token against `username=kristjanjansen` so the URL could carry the user
and survive a switch: `git credential-osxkeychain get` reads the entry back, and
`git credential fill` finds nothing, because the helper on PATH and the one git
resolves out of Xcode's `gitconfig` are different binaries. `git credential
approve` does not fix it either. SSH is not a way round it as things stand —
`ssh -T git@github.com` answers `Permission denied (publickey)`, so there is no
key on the personal account yet. Adding one is the only thing that would remove
this dance.
⚠️ **AND THE COMMITS ARE AUTHORED WITH THE WORK ADDRESS.** `user.email` here is
`Kristjan.Jansen@enefit.ee`, on a personal repository. Nothing was changed about
that, because attribution is not a thing to alter without being asked.

## Run and check

```sh
node demo/server.mjs                     # :8890, serves the repo; / == deployed
node demo/verify.mjs                     # every built demo (CDP, asserts on window.__demo)
node demo/verify.mjs llhls ladder        # just these, by slug
node demo/verify-native.mjs              # THE IPHONE CODE PATH — verify.mjs cannot reach it
node demo/fake-station.mjs               # an Icecast mount that is nobody's radio
node demo/fake-tapes.mjs                 # an archive that is nobody's archive
node demo/fake-err.mjs                   # a live edge that is nobody's broadcaster
node demo/shell/looper-test.mjs          # the looper's arithmetic, no browser
node demo/shell/xr-quit-test.mjs         # is there really a way out of every headset page
node workers/mail/test.mjs               # what arrives at positron@ is spam or a person
node demo/resources/measure-durations.mjs   # how long each recording is, asked once
node demo/resources/build-mimproject-images.mjs --check   # the recovered pictures, prints only
node demo/verify-safari.mjs              # desktop Safari over WebDriver, both engines
DEMO_BASE=https://positron.studio node demo/verify.mjs      # against the deploy

cd workers/view && node build.mjs && npx wrangler deploy    # ALWAYS build first
```

`.env` in the cwd shadows machine OAuth. Deploy from a directory without one, or
`env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler deploy`.

Device logs from any phone or headset:
`https://pub.positron.studio/logs?format=text`. 🔴 **Those reports used to
evaporate in under a minute** — the ring buffer was an in-memory array on a
Durable Object, so an eviction took it with it. MEASURED 2026-09-12: posted at
02:07:46, read back fine, **gone by 02:08:32**. The failure mode is the worst
shape there is — the device ships correctly, the reader sees
`(nothing reported)`, and the obvious conclusion is that the device never sent
anything, so somebody debugs the device. Persisted to DO storage now and
re-checked at 120 s. **Any "the phone reported nothing" conclusion drawn before
2026-09-12 is worthless.**
Every 06 log opens with `BUILD <sha>-<hhmmss>`, so a report can be attributed.
Clear with `POST /logs/clear`. `GET /status` blocks on the container's cold start
— that is expected, not a hang.

## Finding the box, and where its code actually lives

**Ask port 22, not ARP and not mDNS.** `positron-board.local` does not resolve
from this sandbox (mDNS is multicast UDP), a ping sweep answers nothing useful,
and guessing Raspberry Pi MAC prefixes in `arp -an` missed it outright — the
board was there the whole time. One line finds it in about a minute:

```sh
for i in $(seq 1 254); do (nc -z -G 1 -w 1 192.168.1.$i 22 2>/dev/null && echo 192.168.1.$i) & done; wait
ssh positron@<ip> hostname -s            # it answers `raspberrypi`
```

It also answers over the relay from any network — `node rig/board/ask.mjs --room
studio-1 audio.status` — so **"I cannot ssh to it" is never the same as "it is
down"**, and saying the second because of the first is wrong. Ask the relay
first; it needs no LAN.

⚠️ **The service runs from `/opt/positron-board/`, NOT from `~/positron/`.**
`provision.sh` unpacks into `~/positron` and `setup.sh` copies that to
`/opt/positron-board`, which is what `positron-board.service` executes. The copy in
`~/positron` on the board is stale — it has no `pappus.mjs` at all — so editing
or checking it tells you nothing about what is running. Compare `md5sum` against
`/opt/positron-board/rig/board/` before believing a deploy landed.

## Rules that cost real time to learn

🔴 **DO NOT RE-VERIFY `/radio/` OR PROBE STATION HEALTH. ASKED TWICE.**
*"stop messing around with live stream assertions, you're wasting everybody's
time"*, then *"can we please stop assessing the radio, its killing me and my
budget"*. A run of that page costs minutes and a lot of tokens, it needs a
relay and eight mounts nobody here controls, and what it returns is a fact
about somebody else's server rather than about our code. Four of eight were
down the last time it was run, which is the normal state of it.
**Change the page, syntax-check it, ship it** (`node demo/check-html.mjs
demo/<slug>/index.html` parses every module block without opening a browser).
A red run on that page is not information until somebody asks for it.

✅ **AND SINCE 2026-09-16 IT CAN BE GRADED WITHOUT COSTING ANYBODY ANYTHING.**
`node demo/verify.mjs radio` starts `demo/fake-station.mjs` itself and points
the page at it with its own `?base=`: real MP3 frames, real ICY headers, a real
`icy-metaint` text channel and a `/health` route in the relay's shape, paced at
128 kbit/s. **MEASURED: 48/48 green with zero bytes from anybody's radio.** So
the rule above is now about the RELAY and the mounts, not about the page: run
the page freely, and never `curl` a mount, a health route or a live segment to
find out whether somebody else's server is up.
⚠️ It grades OUR code. A stand-in cannot tell you a mount is 403ing, and a page
green here can still meet one out there.
⚠️ `DEMO_QUERY=base=…` overrides it, which is the escape hatch for somebody who
has been ASKED to check the real relay.
🔴 **AND A STAND-IN CANNOT BE USED AGAINST THE DEPLOY. MEASURED 2026-09-20.**
`DEMO_BASE=https://positron.studio node demo/verify.mjs radio` starts
`fake-station.mjs` on `127.0.0.1` and points the page at it, and Chrome refuses:
*"Permission was denied for this request to access the `loopback` address
space"*. A secure public origin may not fetch a loopback address. It reads as
**4 red on a page where nothing is wrong**, two of them `no console errors` and
`no failed requests`, which is the worst possible face for a harness artifact.
⚠️ So `radio`, `tapes`, `now` and `flipper` are verified LOCALLY, and
`DEMO_BASE` is for pages whose sources are already public. MEASURED both ways:
`DEMO_BASE=… node demo/verify.mjs making items` is **61/61**, the same command
with `radio` appended is **72/76**, and `node demo/verify.mjs radio` on its own
is **14/14**.

🔴 **AND IT IS NOT ONLY ERR. EVERY EXTERNAL SOURCE, 2026-09-16:** *"stil: super
careful with external sources, better avoid"*, said in reply to
*"it uses archive.org, not ERR, so it is safe to run"*. That reasoning was the
mistake: the ERR rule is written about a broadcaster's listener statistics, and
it was read as though the SPECIFIC harm were the whole rule, so a harness that
pulls twenty-four recordings off archive.org on every run was called safe.
**The rule is about whose server it is, not about which harm has been named
yet.**

✅ **AND `/tapes/` HAS ITS STAND-IN SINCE 2026-09-18, SO THIS RULE NO LONGER
COSTS ANYBODY A PAGE.** `demo/fake-tapes.mjs` is an archive that is nobody's
archive: it reads its paths off `corpus.json` rather than a list, so it cannot
drift from the page, and it tiles one 8 s MP3 BY THE BYTE to any length (48 kHz
at 64 kbit/s makes `144*bitrate/rate` whole, 24.000 ms and 192 bytes a frame, so
every wrap lands on a frame boundary and a Range reply needs no frame table).
The 24 rows are 2 h 22 m and 68 MB, never allocated. `node demo/verify.mjs
tapes` starts it and points the page at it with its own `?base=`:
**MEASURED 38/38 with the only hosts contacted being the dev server and the
stand-in.** The instrument is not blind, which is the half that makes the claim
worth anything: pointed at a dead port the same run names that port and takes 5
asserts red.
⚠️ It grades OUR code, exactly as `fake-station.mjs` does. A stand-in cannot
tell you a recording is 403ing out there.
⚠️ **AND TWO HOLES IN `/tapes/`'S OWN CHECKS WERE FOUND BY SABOTAGING IT**: a
stand-in serving every recording at HALF its corpus length still reads 38/38,
and one serving SILENCE reads 38/38 too. Both are in `BACKLOG.md`.

✅ **AND `/now/` AND `/flipper/` HAVE THEIRS SINCE 2026-09-18, WHICH WAS THE
LAST PAIR STILL POINTED AT A BROADCASTER.** `demo/fake-err.mjs` is an HLS live
edge that is nobody's broadcaster: a master, a media playlist sliding with wall
clock at 2 s a segment over a 2 h window, one `PROGRAM-DATE-TIME`, MPEG-TS that
really decodes, Range, `#EXT-X-DISCONTINUITY` at the pool's one seam, the
schedule endpoint and the five radio mounts. `demo/shell/err-live.mjs` gained
`errUrl()` and a `?base=`, and `/flipper/` now imports `CHANNELS` from it rather
than holding a fourth copy. **MEASURED, AND RE-RUN INDEPENDENTLY: `now` and
`flipper` together 52/52 with the only hosts contacted being the dev server and
the stand-in.** Cold build 55.4 s and 105 MB, cached in the system temporary
directory. ⚠️ **IT REPRODUCES THE REFUSALS, NOT JUST THE STREAM**: 403 with no
`access-control-allow-origin`, in the three shapes measured on 2026-09-06,
verified by a 13-point sweep.
🔴 **AND BOTH PAGES ARE BLIND TO THEM.** Switching the refusal off entirely
leaves both fully green and changes only the harness's own summary line, `+33
upstream refusals` becoming `+3`. Corroborated separately: **no assert in either
page names a refusal, a 403 or a served segment.** So the boundary neither page
can work without is graded by nothing, which is the same hole already recorded
twice for `fake-tapes.mjs`. In `BACKLOG.md`.
⚠️ **NO BURNED CLOCK IN THAT PICTURE, AND THE REASON IS ALREADY IN THIS FILE.**
`ffmpegFilters()` needs `drawtext`, which needs libfreetype, and the ffmpeg on
PATH here reports zero `drawtext` filters. `src/publish.sh` pins `ffmpeg@7` for
exactly this and says so in a comment.

🔴 **AND THE COST IS NOT OURS TO PAY. ERR SAID SO, 2026-09-16, RELAYED TO
KRISTJAN:** *"ERRil oli ka probleem, et nende kuulajastatistika läheb sassi"* —
their LISTENER STATISTICS were being corrupted by us. That is a different and
worse kind of damage from load: a broadcaster's audience figures are what it
reports to its board and its funders, and a few dozen headless Chromes holding
mounts open for hours are counted as listeners who never leave. It cannot be
undone by stopping, only by not adding to it. So the rule is not *"a red run is
a fact about somebody else's server"* any more, which was an argument about the
VALUE of the check. It is: **every connection this repo opens to an ERR mount
appears in a public broadcaster's audience measurement, so open one only when a
person is going to listen to it.** `/radio/` and `/videoradio/` both rotate
four ERR mounts; that covers every harness run, every `verify-gl.mjs videoradio`,
every reload in a development loop, and every tab left open on a second monitor.
⚠️ Two stations were REMOVED over this and ERR was not: `idaidaida.net` and
`live.uuu.ee` are gone from the code and the relay 404s them. ERR is still in the
rotation, which means the exposure is still live and the only thing holding it
down is nobody running the page.
⚠️ The same goes for `curl .../health`, for re-running a demo to attribute a
flake, and for A/B'ing a failure that the rules already say is external. The
answer to "is it red because of me or because of them" is: SAY BOTH ARE
POSSIBLE AND MOVE ON.

🔴 **AND THE WORST SHAPE IS NOT A HARNESS, IT IS A PAGE THAT OPENS SOMETHING ON
LOAD. FOUND 2026-09-19 ON `/reel/`.** That page called `play(openOn, true)` on
its load path, so **every visit** asked arhiiv.err.ee for a newsreel and that
day's radio and then held a stream, for a first frame nobody had asked to see.
The `armed` flag beside it suppressed `.play()` and never suppressed the FETCH,
which is why it read as harmless. A harness run costs that too, and `/reel/` is
`built: true`, so it was in every full suite.
✅ **REPAIRED BY SPLITTING THE VERB.** `select()` moves the playhead, frames the
view and fills the caption and opens NOTHING; `play()` is the only half that
reaches ERR, and its callers are a press on a mark, a press of play on a day
already picked, and a step or a scrub that lands while something is already
playing. A visit, a step and a scrub across a stopped year are all somebody
reading the line, and none of them is a listener.
⚠️ **THE RULE IS NOT GATED ON THE HARNESS AND MUST NOT BE.** A page that behaves
one way for `?selfcheck=1` and another way for a person is a page nothing
grades. "Stepping while stopped opens nothing" is true for everybody.
⚠️ **AND THE AUDIT IS ONE WRAPPER, NOT A READING.** Every URL that can leave for
ERR goes through one counted function, so "a visit opens nothing" is an ASSERT
over a counter rather than a claim about a file. Six of the nine were media
source assignments rather than `fetch`, which a grep for `fetch` would have
missed entirely.


✅ **AND THE HOLE A STAND-IN LEAVES IS CLOSED BY SABOTAGING IT, NOT BY READING
IT.** 2026-09-18, on `/now/` and `/flipper/`: both were FULLY GREEN against
`demo/fake-err.mjs` with its `serves()` forced to `return true`, because no
assert in either page named a refusal, a 403 or a served segment. `/flipper/`
had the blocked minutes in a READOUT CELL, and a cell is not an assert. Four
instances of one pattern now, counting the two on `fake-tapes.mjs`: **a stand-in
makes a page runnable without making it graded.** The fix is the same every
time: break the stand-in on purpose, and whatever stays green was never being
measured. Both pages assert it now, and the same sabotage takes 4 red.
⚠️ **AND A NEGATIVE CONTROL IS THE HALF THAT PROVES THE INSTRUMENT.** A page
that reported a boundary whatever it was shown would pass "a boundary was
found". `fake-err.mjs` wears three measured shapes at once, so both pages survey
all three channels and assert BOTH that a walled channel is found AND that a
channel refusing nothing is reported as refusing nothing. The first goes red
under the sabotage; the second stays green, which is correct.
🔴 **A SEGMENT THAT EXPIRED LOOKS LIKE A SEGMENT THAT WAS REFUSED, AND
MEMBERSHIP HAS TO BE CHECKED AT PROBE TIME.** `err-live.mjs` fact 2 says only
ever probe segments from the playlist just read. That is necessary and NOT
sufficient: a thirteen point sweep takes seconds, the window slides while it
runs, and the OLDEST point comes back 403 for the other reason. MEASURED:
`#.......#####`, two boundaries drawn where there is one. Drop points no longer
in the freshest playlist, and say how many were dropped.

🔴 **A COUNTER BEATS A STATE WHEN A CHECK RUNS NEXT TO AN EVENT.** `/flipper/`
read 8/8 against a closed port because `the selected channel is open or loading`
was satisfied by `!!c.hls`, true the instant `new Hls()` returns. The repair is
not a better instant: `readyState` is an instant too, and a WORKING page read
`readyState=1` because the check runs one line after a seek, which empties the
buffer. **`totalVideoFrames` counts what the element has EVER decoded and a seek
does not reset it.** Ask what has happened, not what is happening.

🔴 **A SELF-CHECK NEVER RUNS FOR A VISITOR. NOT ONE, NOT EVER, ON ANY PAGE.**
Instructed 2026-09-16: *"rip those selfchecks out of user experience and make
rule about it"*. It is gated on `?selfcheck=1`, which `demo/verify.mjs` appends
to every demo it opens, and the DEFAULT IS OFF. There is no page that is an
exception, and the two arguments that were used to make exceptions are both
answered below.

✅ **THE GATE IS A KIT MODULE SINCE 2026-09-18: `demo/shell/selfcheck.mjs`, AND
ALL FORTY PAGES ARE SWEPT.** Import `SELFCHECK`, or `ifSelfcheck(fn, { log,
say })` where a visitor would otherwise be left with empty cells and no account
of why. It was one line copied per page for four pages and the other forty-one
never grew it; one import is greppable, which is the half that makes a sweep
finishable. ⚠️ Sixteen pages needed NO change, because everything costly in them
already sat behind the press a visitor makes, so they carry no `selfcheck`
string and `grep -L selfcheck demo/*/index.html` still lists them. That grep is
not a ledger of unswept pages.
🔴 **AND `verify-gl.mjs` AND `verify-quest.mjs` DID NOT APPEND THE FLAG UNTIL
THAT SWEEP.** Only `verify.mjs` did, so gating any `gl: true` page switched its
checks off in every harness able to reach it, silently. `/videoradio/` had
carried its own gate for two sessions with its checks running NOWHERE, and its
comment named that file as *"a harness to fix rather than a reason to work a
visitor's controls"*. Both append it now, after `DEMO_QUERY` so an override
still wins. ⚠️ **`node demo/verify-gl.mjs videoradio` THEREFORE COSTS ERR NOW
AND DID NOT BEFORE**: that page rotates four ERR mounts.

⚠️ **"NOBODY IS HOLDING THIS ONE" IS NOT AN EXCEPTION.** `/videoradio/` ran its
checks by default on exactly that reasoning: the page moves its own blend,
changes station and runs a loop unattended, so a check that does those things
was said to be indistinguishable from the page working. Everything in that
sentence is true and the conclusion was still wrong, because the check does
things the PAGE never does. It pressed full screen, which took a visitor out of
their own full screen about twenty seconds after they pressed play. That was
reported twice as a mystery timer (*"drops out of full screen after 22 to 25
seconds"*, then *"chrome drops out of fullscreen when radio source changes"*)
and was open for two sessions, because 22 s is also the tour's dwell and 71 s is
the station clock, so the real cause looked like two innocent ones.

⚠️ **"IT IS CHEAP HERE" IS NOT AN EXCEPTION EITHER.** `/tapes/` loaded a tape,
played it and looped it four ways inside three seconds of every visit, because
its checks were never gated at all. Reported as *"tapes still does some loading
and playback on page load"*, and *"omg you still do not get it"* on the third
report.

⚠️ **AND THE GATE HAS TO COVER THE WHOLE COST, NOT THE AUDIBLE PART.** Both
earlier repairs on `/tapes/` were real and neither was this: one shut the sound
gate, the other stopped the page asking archive.org for durations. A page can be
silent, ask nobody for a duration, and still spend a visitor's bandwidth on a
12 MB recording and run its transport in front of them. **A VISIT ASSERTS A
STRICT SUBSET** and that is the intended shape: everything gradable from data
already in hand still runs, anything that opens a file, makes a sound, presses a
control or moves the picture does not.

⚠️ **A CHECK THAT MUTATES IS THE TEST, NOT A CHECK THAT IS SLOW.** `/tapes/`'s
zoom check called `openFinish()` one frame into the opening animation, so the
self-moving zoom somebody had asked for was being destroyed by the thing
grading it. It waits for the move now. Ask of every check: if a person were
watching this page, would they see it happen?

🔴 **A REQUEST THAT ARRIVES MID-TASK GOES IN `BACKLOG.md` BEFORE IT IS WORKED
ON.** Over one long run a stream of small requests was tracked in the session's
head instead, and two were quietly dropped: the report that followed was *"do
you have it in yr backlog or you keep losing them"*, which is the right question
and the answer was no. Working from memory is fine for one thing and fails
silently for twenty, because a lost request looks exactly like a request that
was never made. Write the line first, work from the file, strike it off when it
is done. ⚠️ And a line leaves that file by being FINISHED or by being refused in
writing. Never by going quiet.

🔴 **A STREAM OF REQUESTS IS COLLECTED FIRST AND WORKED SECOND. ASKED FOR
2026-09-19:** *"lets work demo by demo. i will give steam of request, you
collect theb to backlog in detail and when done, do a parallelized effort to fix
it all"*. So the rule above has a second half now, and it is about WHEN.
- **While the requests are arriving, write and do not fix.** Every one lands
  under `## Open` in `BACKLOG.md` as it is said: the words verbatim, the slug it
  is about, the file it will touch, and whatever is already known that makes it
  non-obvious. Fixing the first one while the fourth is being typed is how a
  request gets answered with a change nobody can find later, and it spends a
  page's verification budget before the page has stopped changing.
- **When the stream ends, fan out.** One agent per page, because the pages are
  independent. ⚠️ **ANYTHING SHARED IS DONE ONCE, BY ONE AGENT, BEFORE THE
  PAGE AGENTS START**: a kit module, `shell.css`, a diagram rule, `manifest.mjs`.
  Otherwise four agents write four versions of it in one checkout, which is the
  hand-rolled control rule arriving by a different road.
- 🔴 **AND THE AGENTS DO NOT COMMIT.** Already written below and it is worth
  repeating here, because this arrangement is exactly the shape that breaks it:
  agents report, the session commits, and a commit made while one is running
  stages paths by name.
- 🔴 **VERIFY ECONOMICALLY, WHICH IS AN INSTRUCTION AND NOT A PREFERENCE:**
  *"make sure you do verify steps economically and do not drain the whole system
  with rerunning suites"*. `node demo/check-html.mjs demo/<slug>/index.html`
  parses a page with no browser at all and is the first answer. `node
  demo/verify.mjs <slug> <slug>` runs ONLY the pages that were touched, and the
  thing to look at is the per-page assert count against what it was, which is
  the check this file already asks for after any control changes. A full suite
  is dozens of Chromes and is not how you find out whether one page still works.
  ⚠️ And a red run is not re-run to see if it goes green: the rules above
  already say what an external red means.


**Measure the quantity in question, not one adjacent to it.** An A/B where both
arms share the bug returns "identical", which reads as "fine". Before running a
comparison, ask what defect it could NOT detect.
🔴 **AND THE SHARPEST FORM OF IT IS TWO NUMBERS DERIVED FROM ONE FIELD.
MEASURED 2026-09-19 ON THE MIM CORPUS.** A build's lookup table was keyed by
FILE NAME, a re-encode changed one name, one of two tables was updated and the
other was not, so `NOT_OURS[file]` read `undefined` and **Kanuti Gildi SAAL's
recording was silently re-credited to MIMproject**, with a `holder` field saying
the file was ours. The build printed nothing and every file was present and
correct.
⚠️ **THE CHECK THAT SHOULD HAVE CAUGHT IT AGREED PERFECTLY WHILE BEING WRONG.**
It compared `theirs.length` against `counts.theirs`, and BOTH ARE DERIVED FROM
THE SAME FIELD, so the two halves moved together and the check passed. What
actually found it was a human reading the harness's DETAIL line, where `2 of 28`
had become `1 of 26`.
✅ **THE REPAIR IS TWO INDEPENDENT SOURCES, WHICH IS THE WHOLE RULE**: the page
now compares the NOTE, prose written by hand, against `source`, which comes from
the lookup table, so the two can disagree. And the build THROWS on a key
matching no measured file, proved by putting the old name back.
⚠️ **KEY BY `id`, NEVER BY FILE NAME.** A name is a thing a re-encode changes.

🔴 **A PAGE THAT GAINS ITS FIRST CONTROL MOVES EVERY OTHER CONTROL'S HARNESS
PRESS, AND `settleMs` ONLY EVER LANDS ON CONTROL 0.** MEASURED 2026-09-16 on
`/radio/`: adding one button made the looper's `→` control 1 instead of control
0, so the single press the harness gives it moved from t+1 s to **t+31 s**,
landing in the middle of the page's own loop check and taking it red
intermittently with a face that read `≠`. Nothing about either control changed.
⚠️ The symptom is an intermittent failure in a check that has nothing to do with
the control you added, which is the worst place to start looking. **After adding
or removing a control, re-run the page and diff the per-demo assert count**, and
if a check depends on WHEN a press lands, have it confirm where it landed rather
than assuming.

🔴 **AND A CONTROL YOU DISABLE IS A CHECK THE HARNESS CAN NO LONGER REACH.
MEASURED TWICE IN ONE DAY, 2026-09-19, ON TWO PAGES INDEPENDENTLY.** Both
harnesses drive a page by clicking every button in `.pos-controls`, so a page
whose checks sit behind a press loses them the moment that press stops
happening. `disabled` is not a style, it is a `return` in front of the handler.
- `/mirror/`: switching the VR and AR buttons off when the browser reports no
  headset meant `enterHeadset` was never called, and **ten** asserts about both
  session branches would have gone silent while the page read 41/41 green.
  Caught before shipping; the page now drives whichever mode nobody reached,
  behind `SELFCHECK`, with a map so a real press on a headset is never doubled.
- `/blocks/`: the same change took **six**, and those were reported and replaced
  rather than caught in advance. On a real headset all six come back.
⚠️ **IT IS NOT A REASON TO LEAVE A LYING CONTROL ENABLED.** A button that cannot
do the thing it names is the defect; this is the bill for fixing it. What it
costs is that the checks behind it have to be reachable another way, which they
always could have been, because a check that only a control can reach was
already a check that nobody runs on a machine without that capability.
⚠️ **AND A DISABLED CONTROL IS EXACTLY WHERE THE COUNT LIES QUIETEST.** The suite
stays green either way: those asserts do not FAIL, they simply never run. Diff
the per-page assert count after any change to what a control does, which is the
rule above, and account for every one that moved.

**A green suite can mean zero coverage.** `verify.mjs` reported 261/261 while a
demo was fatally broken on iPhone, because desktop Chrome never enters that
branch. After any change to `src/low-latency-player.js`, run
`demo/verify-native.mjs` too.

**Attribute a run to a build before iterating on it.** Every 06 log opens with
`BUILD <sha>-<hhmmss>`, substituted into the deployed `shell.mjs` by
`build.mjs`. Without it, "still broken" and "the fix never loaded" are the same
observation. **Confirm the stamp changed before asking anyone to retest** — the
edge serves the previous build for a few seconds after deploy.

**Being right about a mechanism says nothing about whether it dominates.** State
what you expect to see if your cause is the real one, then check that you see it,
before shipping a fix.

**When two hypotheses have opposite fixes, build the measurement that separates
them first.** Do not pick between them on plausibility.

**Never guard a patch on `s.includes(<substring>)`.** Three bugs in one day from
this — `BUILD` matched inside `REBUILD`; `LOG_KEEP` and `#log` were satisfied by
the code just inserted. Guard on the exact declaration, or assert the effect
afterwards. Printing "ok" is not evidence.

**`verify.mjs` stops collecting 400 ms after the last assert.** Its stabiliser
waits only while the count is still GROWING, so a check whose FIRST assert sits
behind a wait reports "asserted nothing" (a page that is working reads as
broken), and one that pauses mid-way silently loses every assert after the
pause. Slow work — going live, a recording, resolving a WebM duration — belongs
behind control 0, which is the only control that gets `settleMs`.

**`grep` returns nothing on `timeline/transport.mjs`.** It held two literal NUL
bytes (a cache-key separator typed raw instead of `\u0000`), so BSD grep called
the file binary and printed nothing — not "binary file matches", nothing. Every
search of the timeline core answered "not there", including for `createDeck`,
which is exported ~40 lines from where the search claimed nothing was. The NULs
are now escaped. If a search for a symbol you are sure exists comes back empty,
suspect the file before the symbol: `node -e "…indexOf(…)"` is the second
opinion.

**An engine switch invalidates the harness's HTTP cache.** A media element
loading `video.src = <m3u8>` stores a no-cors (opaque) entry for that URL; the
moment a page switches to hls.js, its XHR for the SAME url is served from that
entry and rejected as a CORS failure — on a URL that answers 200 with
`access-control-allow-origin: *`, and while the page's own `fetch` of it
succeeds in the same run. Two demos read red for exactly this and nothing in
either page was wrong. `verify.mjs` now deletes its profile's Cache before
every run.

**Never let sound gate the work.** `audio.play()` and `AudioContext.resume()`
both wait on a user gesture in a real browser, and neither REJECTS — awaiting
one before doing the real work is a hang, not an error. It cost two demos in one
session: shout spent five seconds buffering an element before its measurement
opened, pushing the whole run past the harness's settle, and vclick awaited a
suspended context and never compiled, never built its deck, never raised its
transport bar — while looking fine, because the readout had been filled at load.
Headless hides it: `--autoplay-policy=no-user-gesture-required` resolves both.
Fire them and move on; sound is allowed to be late, the timeline is not.

**"Is the XR object real" is not "is there a headset", and desktop Chrome is
the proof.** MEASURED while building `verify-quest.mjs`: desktop Chrome has a
genuinely **native `navigator.xr`** — an `XRSystem`, an accessor on
`Navigator.prototype`, every method `[native code]` — and answers
`immersive-vr: false`. So a nativeness test alone passes every laptop, and an
`isSessionSupported` test alone passes a polyfill that claims everything. They
catch disjoint things and BOTH are needed, plus `adb shell getprop` from
outside the browser entirely. The Immersive Web Emulator installs a JavaScript
`XRSystem`, and Meta markets its coverage as "on par with the Meta Quest
Browser" — which is the iPhone mistake in a new accent. `--self-test` runs all
three cases against headless Chrome and needs no device; sabotage
`nativeVerdict` and it goes 3/3 -> 0/3, which is how you know it is not
decoration.

**A second browser of your own is a harness that reads broken.** A full run
went 429/429, then 420/429 with nine failures, then 429/429 again with no code
between them — and all nine were in the three demos that depend on something
outside the machine (`carry`'s relay socket opened 0 times, `shout` read
`peak rms 0.0000`, `now` showed no frames). The cause was two probe Chromes of
mine still holding relay sockets and bandwidth while the suite ran. Re-running
just those three gave 57/57. So **before calling a red run a regression, run the
failing demos ALONE** — it costs a minute and it separates "my change broke it"
from "I was competing with myself", which look identical in the output.

🔴 **A HARNESS THAT DOES NOT DELETE ITS OWN PROFILE FILLS THE DISK, AND THE
DISK FAILING LOOKS LIKE EVERYTHING FAILING.** Every harness here launches Chrome
with a per-run `--user-data-dir`, for reasons that are correct and written down
(a shared profile is a shared HTTP cache, and Chrome writes its real CDP port
inside it). None of them ever removed one. MEASURED 2026-09-14: **229 leftover
profiles, ~20 GB, and the volume down to 119 MB free** — at which point `find`
itself died with ENOSPC and no shell command would run. A profile is ~250 MB and
the suite gets run dozens of times a day, so this leaks about a gigabyte an
hour of ordinary use. ⚠️ **Cleaning up on the way out is not enough**: a run
that is Ctrl-C'd or killed executes no handler, and those are exactly the runs
that happen when something is already wrong. `demo/harness-profile.mjs` does
both halves — `claimProfile()` removes this run's directory on `exit` and on a
signal, and **sweeps directories whose pid is dead**, which is the half that
actually recovers a machine. It is safe because the pid is in the name, so a run
in another terminal keeps its own. ⚠️ And `kill()` ASKS; it does not stop —
with a plain `kill()` the handler deleted the directory and a still-shutting-down
Chrome recreated it, which is a cleanup that runs, reports nothing and does
nothing. SIGKILL and await the child's `exit` before removing. **Say how many
were swept**: a cleanup nobody is told about cannot be told apart from a leak.

**A harness and a dev server that share a port is a harness that reads broken.**
`node demo/verify.mjs` died with an unhandled `EADDRINUSE` three separate times
in one session because `node demo/server.mjs` was still holding 8890 — each
time looking like a broken suite rather than a busy port. `serve()` now takes
the next free port and says so, and the harnesses read `server.address().port`
rather than the one they asked for. The general form: **a fixed port is a
shared mutable global.** The same bug in a second costume is a fixed CDP port —
`verify-gl.mjs` attached to a Chrome left over from the previous run and
reported that run's flags, which is how a SwiftShader test reported ANGLE
Metal. Let the OS choose and read back what you got.

**A wedged hardware encoder cannot be killed, and looks like broken code.**
`/dev/video11` is a single exclusive V4L2 device, and when it wedges, ffmpeg
sits in uninterruptible sleep: `SIGTERM` does nothing, `SIGKILL` does nothing,
`timeout` does nothing, and `modprobe -r bcm2835_codec` answers "Module is in
use". Three ffmpegs stacked up behind it, each one reading from the outside as
"the encoder produces no bytes". Recovery is a reboot. **Check `pgrep -cx
ffmpeg` before concluding anything about an encode** — and `-x`, never `-f`,
because `pgrep -f h264_v4l2m2m` matches its own ssh command line and answers
"still held" about itself. That is LESSONS #39 in a new costume and it cost
twenty minutes twice.

**Ask the picture the right question.** `mirror`'s "there is a picture in it,
not a flat field" assert failed twice on a vivid kaleidoscope. First it sampled
four points — on an EIGHT-FOLD SYMMETRIC radial image, where any two samples at
similar radius are similar by construction, so it was measuring the symmetry of
the thing it was checking. Then it summed R+G+B over the whole frame and read
`9 of 765`, because the shader's colour is three cosines 120° apart and **three
cosines 120° apart sum to a constant**: the image varies almost entirely in HUE
at near-constant luminance. Per channel, red alone spans 26..254. A statistic
that is constant by construction over your subject is not a weak measurement,
it is a blind one.

**Prove a guard fires.** Break the thing on purpose once. And note `cmd | tail`
reports `tail`'s exit status, not `cmd`'s.

**When you implement somebody else's format, only their implementation can
grade you.** `timeline/csound.mjs` was 22/22 green for months with two real
defects, because the test compared it against a number derived from the SAME
formula the compiler implements — which catches a typo and can never catch a
misreading. Real Csound found both in an hour: the tempo ramp was 239 ms out at
beat 30 (Csound interpolates seconds-per-beat linearly in beat, not tempo), and
`^+x` resolved against the wrong note. The warning comment in that file was
worse than useless — its confident "118 ms early" was the distance between two
WRONG answers. `timeline/lab/csound-oracle.mjs`; it skips cleanly where the
reference is not installed, because a check nobody can run is a check nobody
runs.

🔴 **CHECK THE INSTRUMENT BEFORE REPORTING AN ABSENCE, AND THREE DIFFERENT
REFUSALS IN A ROW ARE THE INSTRUMENT.** MEASURED 2026-09-19 on two works
addressed on IPFS: one `curl -I` each at three gateways gave **429, 406 and
301**, and that was written up and REPORTED as *addressed, not retrieved*, with
the open question being whether anybody still pinned them. Every one was rate
limiting or a redirect. With a real user-agent, a **ranged GET rather than
HEAD** (HEAD is what those gateways throttle hardest) and six seconds between
calls, five gateways answer 206 and both 77.9 MB files came down in **under four
seconds**.
⚠️ Three hosts refusing in three different ways is not three facts about the
content, it is one fact about how you are asking. **An absence reported as fact
is the expensive kind, because nobody re-runs it.**

🔴 **AND A DOMAIN OUTLIVES THE PEOPLE WHO HAD IT.** A Wayback survey of
mimproject.org returned 67 pictures and four were adverts for a Thai online
casino: everything under `/uploads/2025/01/`, after the domain lapsed and was
picked up for gambling SEO. Nothing in a CDX row says who owned the host that
day, and **`a 2025 revival` was written into four files before anybody opened a
picture**. A site coming back and a site being taken are the same shape in an
index of URLs. Open the pictures; key any provenance claim on something other
than the URL.

**A partial result that is too tidy is a broken collector, not a finding.**
Exactly 4 of 5 events, exactly 0 across every case, exactly nothing on the
network scan. In one session: csound writes ANSI escapes so `grep '^EVT'` lost
most lines; `execFileSync` returns only stdout while csound's `prints` go to
stderr; and `.local` names do not resolve at all from this sandbox because mDNS
is multicast UDP. Check the instrument before believing the pattern.

**Long measurements: no pipes, no dangling promises.** `node x.mjs | tail` buffers
until exit and looks hung — write to a file. An un-awaited `fetch` keeps the
event loop alive forever.

**Read the comments already in the file.** `src/publish.sh` pins `ffmpeg@7`
("needs libfreetype for the clock overlay") and the publisher says "the key must
never be echoed". Both were correct and both were ignored, each costing a run.

**A recovery action is not free.** Rate-limit it, require it to have somewhere to
land, and make it yield rather than retry forever — see `low-latency-player.js`,
where a drift-seek every 2–3 s aborted the in-flight fragment loads it was trying
to recover.

## Platform facts

- **`rack` plays Ableton Live from a browser and it is LIVE (2026-09-12).**
  <https://positron.studio/rack/>, 15/15. A note number crosses the relay,
  `rig/m1/live-agent.mjs` hands it to Live over CoreMIDI, and a **Core Audio
  process tap** sends a copy of what Live renders back down the same socket —
  so Live keeps playing out of its own speakers while the page hears it too.
  `/keys/` is the SAME PAGE pointed at a Raspberry Pi. **No BlackHole, no
  Multi-Output Device, no Live Preferences click** — the tap removes the one
  requirement the Live Object Model could not script, which is what parked the
  old rig. It stays up by itself via `studio.positron.rack-agent.plist`
  (a LaunchAGENT — TCC grants need a GUI session, a daemon would get silence
  that reads as success). MEASURED: silence 0.00000, keys down **-5.3 dBFS**,
  0 dropped of 801, 50 frames/s at 1541 kbit/s stereo, agent 4.2% of one core.
  ⚠️ **The old "a capture started over ssh is deaf" rule does NOT apply here** —
  that was `ffmpeg -f avfoundation`, whose TCC subject is the terminal;
  `audiotap` disclaims responsibility and is its own subject, measured working
  from an ssh-started process.
- 🔴 **YOSHIMI DOES NOT USE THE GENERAL MIDI CONTROLLER MAP, AND ASKING IT FOR A
  VIBRATO GETS A SLIDER THAT DOES NOTHING.** In General MIDI, 76 and 77 are
  vibrato rate and depth. In the ZynAddSubFX family they are **FM amplitude** and
  **resonance centre**, and the rest of the extended set is 71 filter Q, 74
  filter cutoff, 75 bandwidth, 78 resonance bandwidth. MEASURED 2026-09-16 with
  `node rig/board/wobble-test.mjs`, one note held throughout and every controller
  read twice at one value first: CC 76, CC 77 and the mod wheel move the pitch
  by **0.2 cents** at every value, which is the tracker's own noise.
  ⚠️ **THAT WAS FIRST WRITTEN AS "THERE IS NO VIBRATO ON THIS INSTRUMENT" AND
  THAT WAS WRONG, TWICE OVER.** Challenged 2026-09-17 with *"Sure there is no
  lfo?"*, which was the right question. It had been measured on ONE patch, so a
  patch with no LFO configured was being reported as a fact about Yoshimi; and it
  tracked PITCH only, so an amplitude LFO would have read as flat however obvious
  it was to a listener. MEASURED on `Trem Lead` (bank 110, program 8) with a
  level analyser graded on synthetic tremolo first: a real **21 to 25% deep**
  tremolo at about **1 Hz**, and 1.2 cents of pitch wobble against 0.2 on
  `AddSynth Morph`. **THE LFOs ARE THERE.** What is true is the narrower claim:
  no controller reaches one. CC 76, CC 77 and the mod wheel leave that patch's
  tremolo rate and depth inside their own floor, so a slider labelled LFO speed
  still has nothing to drive. What 75 and 76 DO move is large —
  bandwidth takes the beating between partials from 225 cents at 6 Hz to 114
  cents at 0.8 Hz, FM amplitude takes it from 149 cents to 0.2 — so `/knobs/`
  carries those two beside cutoff and resonance.
  ⚠️ **AND `AddSynth Morph` MOVES ON ITS OWN, WHICH BREAKS A HELD-NOTE FLOOR.**
  Two takes at one value, four seconds apart, differ by **0.58 octaves** of
  brightness. A timbre claim about a controller on that patch needs
  `cc-test.mjs`, which re-triggers the note and so resets the morph; a pitch
  claim is safe, because its floor is a fifth of a cent.
  ⚠️ **THE FIRST TWO BUILDS OF THAT TOOL MEASURED THE WRONG QUANTITY AND PASSED
  THEIR FLOOR PERFECTLY.** A vibrato is a pitch wobble and both early builds
  measured LEVEL: one saturated its crossing counter and reported 19.15 Hz to
  four figures about every controller at every value, the next read **0.85 Hz
  for a 2.0 Hz drive**. A floor proves an instrument does not invent movement.
  Only a KNOWN signal proves it can see any, which is why that file grades its
  analyser on synthetic tones before it says a word about the board.
- 🔴 **A CHANNEL COUNT CANNOT BE INFERRED FROM A PAYLOAD.** 960 int16s is a
  valid 20 ms mono frame AND a valid 10 ms stereo one; guessing wrong plays an
  octave down, which sounds like a broken instrument rather than a broken
  header. The Mac sends stereo, the board sends mono, **both are on the relay at
  once**. Senders declare `audioChannels` AND `frameMs`; receivers CHECK one
  against the other (`samples / channels / rate` must equal `frameMs`).
  ⚠️ Not `channels` — `board.mjs` has that and it means MIDI channels.
  And **a measurement outranks a repeated claim**: proved by shipping a liar,
  which exposed the page correcting itself and then being un-corrected by the
  next status reply repeating the same wrong number.
- 🔴 **A bit-clean stream can still sound broken, and the cushion is where.**
  `pcm-playout` trimmed 15 ms of audio mid-note on ordinary jitter — floor
  60 ms, slack 15 ms, frames arriving in 20 ms lumps, so ONE early frame tripped
  it. The samples measured identical to the source (same pitch, same peak, zero
  discontinuities) and the suite was green the whole time, because the defect is
  downstream of every quantity being measured. Slack now follows the frame size
  the worklet OBSERVES. **Every stage that can discard data needs a counter a
  page actually displays** — these counters existed, posted every 250 ms, and
  no page had ever read one.
- **The Ableton rig is PARKED (2026-09-11) and it is parked working — 11/11.**
  Not broken, too heavy: six things must be true before a note sounds and
  **four are Preferences clicks with no API**, including Live's audio output
  device, which the Live Object Model cannot set. A capture started over ssh is
  deaf, so its relay agent must live in a login session — the box is a service
  that dials out on boot, this is a performance instrument you wake on purpose.
  `rig/m1/README.md` has the measurements, the two traps and the
  revisit order. `/rack/` stays live and reports silence AS silence.
- **An avfoundation device INDEX is a shared mutable global, exactly like a
  fixed port.** `ffmpeg -f avfoundation -i ":0"` meant the microphone when
  `rig/m1/README.md` was written and means **BlackHole** today —
  and both read **-91.0 dB**, where one reading proves "this capture is deaf"
  and the other proves "nothing is playing", which are opposite conclusions
  from an identical number. The README's own deafness control had been
  measuring the wrong device. Resolve by NAME from
  `-list_devices true` every time; `rig/m1/live-check.mjs` does.
- **WebXR, MEASURED on a Quest 3 (Browser 150.1 / Chromium 150, Adreno 740),
  2026-09-12.** The framebuffer is **3360x1760, two views, 1680x1760 per eye**,
  and `scene` holds **89.8 fps** in it — full rate. The 2D window really is
  **1280x670 CSS at dpr 1**. `session.frameRate` is **not reported**. The user
  agent says **"Quest 3" on a 3S**, which is the empirical form of the claim
  that the two cannot be told apart. **Passthrough works and is real**:
  `immersive-ar` reports `environmentBlendMode: alpha-blend` and holds
  **90.0 fps** — the same as VR's 89.8, so compositing over the room costs
  nothing measurable here.
- 🔴 **AUDIO SURVIVES AN IMMERSIVE SESSION ON A QUEST, AND COSTS NOTHING.
  MEASURED 2026-09-16 by `/earshot/`, 68 s, 3322 frames, and every number here
  is off the device log rather than reasoned about.** The four questions
  `plan-videoradio-xr.md` §11 refused to answer without a headset are answered:
  - **The `AudioContext` survives.** `running` before `requestSession`, through
    the whole session, and after it ends. It is never suspended by entering.
  - **The latencies do not move.** Window **48000 Hz, base 4.00 ms, out
    24.00 ms**; in session **48000 Hz, base 4.00 ms, out 24.00 ms**, identical
    to the digit. ⚠️ AND THE HEADSET IS NOT THE LAPTOP: the same page on an M2
    Mac reads base 5.33 / out 16.00, so the Quest has the lower processing
    latency and the higher output latency, about 28 ms of total against 21.
  - **`AudioDecoder` configures and decodes in there.** `mpeg` -> mp3, 470
    frames in, 120 out, 44100 Hz, 2 ch, **0 errors**, in 140 ms against 998 ms
    for the same work in the window (the window's number includes a cold fetch;
    the range read was 155 ms there and 4 ms in session).
  - **A main-thread `ScriptProcessorNode` keeps up at 90 Hz.** 11.87 to 12.01
    callbacks a second against 11.72 nominal, for the whole session, never once
    starved. The window on the same device read 11.65.
  - **And 90.0 fps held throughout** with the audio graph, the decoder and a
    panel upload all running. Worst frame gap 70.6 ms, once.
  ⚠️ **The level meter was proved to be a meter INSIDE the session**, not just
  in the window: shutting the gate took the far side `0.0354 -> 0.0000 ->
  0.0355` while the near side held at 0.7050. Without that, a zero in there
  would have been indistinguishable from a page that had stopped measuring.
  ⚠️ **A doff is reported about ten seconds late.** `visibilitychange` fired
  9.5 s after the session ended, which is the lag the page warns about in its
  own log and is now measured rather than assumed.
  🔴 So an immersive page on this device may decode, granulate and play exactly
  as the window does. **Nothing about audio is a reason not to build `/videoradio/`
  into a headset.**
- 🔴 **A PAGE CAN DIM THE REAL ROOM AND CANNOT TINT IT, AND THE PROOF IS
  ARITHMETIC RATHER THAN AN API.** Worked out 2026-09-19 against the Held in
  Human score, whose two channels are exactly these.
  In an `alpha-blend` session the visitor sees `c*a + room*(1-a)`. **The room
  only ever appears multiplied by `(1-a)`, ONE SCALAR SHARED BY ALL THREE
  COLOUR CHANNELS.** So dimming is free and per channel gain is unreachable,
  and a colour lookup table on the camera image is the smallest thing that
  needs per channel gain.
  ✅ **THE DIMMER IS ALREADY IN THIS REPO AND NOBODY NOTICED.**
  `xr-room.mjs:1739` and `xr-panel.mjs:1410` both do `if (ar) gl.clearColor(0,
  0, 0, 0)`. **That zero IS the opacity control**, and both ends of it are
  already measured on a Quest here: `a = 0` is how four pages work, and `a = 1`
  is the black room bug the rule below records.
  ⚠️ **A COLOURED QUAD IS NOT A TINT, IT IS A LIFT**, and it spends the
  dimmer's own budget. At 15% room with a green table, a green wash pins the
  green channel above 0.85 everywhere and you get a green card with a ghost in
  it.
  ⚠️ **`XRRenderState` HAS NO KNOB FOR ANY OF THIS.** Read off Chromium 153 on
  a `127.0.0.1` origin: `baseLayer`, `constructor`, `depthFar`, `depthNear`,
  `inlineVerticalFieldOfView`, `layers`, and not one is about the environment.
  The session REPORTS `environmentBlendMode` and does not take one.
  ⚠️ **AND `navigator.xr` IS SECURE CONTEXT GATED**, so a probe on
  `about:blank` answers "no WebXR here" for the wrong reason. That cost the
  first attempt at this measurement.
  ⚠️ `getCameraImage` exists in Chromium 153 and Quest Browser 40.1 shipped
  passthrough camera, so the route is real and the price is the whole thing:
  you obscure the compositor's passthrough, redraw the camera image yourself,
  reproject it per eye without the compositor's scan out reprojection, and end
  with a video backdrop rather than a room.
- 🔴 **`alpha: false` on the WebGL context makes passthrough impossible.** The
  compositor puts the real room behind the page and can only do that through
  transparent pixels; with no alpha there is nothing to clear to zero and the
  room is replaced by black instead of composited under. And **assert on
  `environmentBlendMode`, never on the session name** — a session can be called
  `immersive-ar` and still composite `opaque`, which presents as a drawing bug
  rather than a session one.
- 🔴 **`session.renderState.baseLayer` is NULL until the next animation frame.**
  `updateRenderState()` queues; it does not apply. Reading
  `baseLayer.framebufferWidth` one line after creating a session throws a
  TypeError — which cost three headset runs, because the throw escaped the
  handler and so the render loop, the exit-on-any-button and the bail-out timer
  were ALL never registered. Session live, nothing drawing, no way out, no log
  line. Read the layer inside `requestAnimationFrame`, where it exists.
- **Instrument the entry path BEFORE guessing at it.** Those three runs were
  indistinguishable from outside; what separated them was a line shipped before
  and after every await, with a deadline turning a hang into a named failure.
  ⚠️ And the lines that say where something hung **cannot be on a batched
  shipper** — `createShipper` holds for 2 s, and entering an immersive session
  is exactly when timers stop being generous. `navigator.sendBeacon` survives
  it. The uncaught-error handler has to use it too, or the net meant to catch a
  silent failure is itself waiting on the timer that stopped.
- 🔴 **AND SO DOES ANYTHING THAT FILLS A SCREEN, WHICH IS THE SAME RULE WITH NO
  HEADSET IN IT.** Reported 2026-09-19 from an iPhone: *"I can not leave
  fullscreen on mobile"*. `/weight/` and `/floor/` each drew a badge reading
  `Esc to leave`, on a device with no Escape key, and then faded it out after a
  few seconds; the faux cover is `position: fixed; inset: 0; z-index: 60`, so it
  is over the control row holding the button that got you in. A phone was
  therefore in a page it could not leave. "Press Escape" on a phone is "press
  the Meta button" in a different accent, and both are answers a page does not
  get to give about its own bug.
  ⚠️ **THE EXIT IS A COMPONENT AND IT IS MOUNTED INSIDE THE ELEMENT THAT WENT
  FULL.** In real element fullscreen nothing outside that subtree is on screen,
  so a button anywhere else is invisible on exactly the path where it is the
  fallback. It fades on inactivity and comes back on any pointer, touch or key,
  and while it is faded it is `pointer-events: none`, or the corner of the
  picture silently exits for somebody reaching for the picture.
- 🔴 **ANYTHING IMMERSIVE NEEDS A WAY OUT THAT THE PAGE OWNS, AND THERE IS ONE
  OF THEM: `demo/shell/xr-quit.mjs`.** Hold ANY controller button for 3 s and a
  white arc fills at your hand; let go and it cancels to zero. Plus a dead-man's
  switch that ends a session where NOTHING has been drawn after 4 s, which is a
  different failure and not a user-facing exit. "Press the Meta button" is not an
  answer a page gets to give about its own bug.
  🔴 **NO LABELS ON IT, 2026-09-19:** *"hold any controller button down long
  enough it shows circular coundown (no labels) and quites"*. Nothing is drawn
  until something is held: the arc IS the badge, and the gesture is the
  documentation. It used to carry the word `Hold to quit`, which is furniture you
  read once and look past for the rest of a session.
  🔴 **AND A PAGE MUST `update()` IT, NOT ONLY `draw()` IT. THIS FAILED IN THE
  WILD:** *"i was not able to get out"*, 2026-09-19. `/blocks/` built the badge,
  compiled its shader and drew it at both hands every frame, and never once
  called `update`, so the hold could not advance and **there was no way out of
  that page at all**. Every other page had the line, so no shared code was wrong
  and nothing could disagree with anything.
  ⚠️ **`node demo/shell/xr-quit-test.mjs` REFUSES THAT SHAPE NOW**, because the
  defect is a line that is NOT there and no browser check can see one: a harness
  cannot enter a session, and in one, `update` not being called is
  indistinguishable from nobody pressing a button.
  ⚠️ **ITS FIRST BUILD WAS WORTHLESS AND ONLY SABOTAGE SAID SO.** It matched
  `/\.update\s*\(/`, and `/blocks/` updates its room, its hands and its
  document, so deleting the quit's own call left it fully green. It matches the
  ARGUMENT now (`inputSources`, which nothing else is handed). That is the
  substring rule below, met while writing a check that quoted it.
- **`gl.clear` ignores the viewport.** Both eyes share one framebuffer, so a
  clear on the second view wipes what the first drew — black. Only the first
  eye clears; the rest clear DEPTH inside a `gl.scissor`, or the second eye
  tests against the first eye's depths. A viewport is not a clip region.
- **`bindAttribLocation` only takes effect at the NEXT link.** Called after
  `linkProgram` it is a no-op that reads like a fix; the Quest reported
  `GL_INVALID_OPERATION` (1282) on its first frame and **drew correctly
  anyway**, because the linker happened to choose the same slots. A page will
  render a right-looking picture with an error pending, so assert on
  `gl.getError()`.
- **iPhone Safari has NO element Fullscreen API.** Not `requestFullscreen`,
  not `webkitRequestFullscreen` — the only thing that fills an iPhone screen is
  a `<video>`, via the non-standard `HTMLVideoElement.webkitEnterFullscreen()`.
  iPad is different (iPadOS carries the prefixed element API), so **"iOS" is the
  wrong unit** and the capability has to be asked, not branched on by platform.
  `mirror`'s ⛶ did nothing at all on an iPhone because `p.requestFullscreen?.()`
  **optional-chains straight past a missing method**: no throw, no `catch`, no
  log line, no picture — optional chaining is an excellent way to build a
  control that looks live and is inert. `demo/shell/fullscreen.mjs` tries the
  real API, falls back to a `position:fixed` cover that needs no API, and says
  which ran. ⚠️ **Style it with a CLASS, never `:fullscreen`** — a browser that
  does not know that pseudo-class discards the entire selector list it appears
  in, so `.pane:fullscreen, .pane.pos-full { … }` would delete the fallback on
  precisely the browsers that need it. And the utility needs (0,2,0): MEASURED,
  a bare `.pos-faux` lost to a page's own `.pane { position: relative }` on source
  order and the cover stayed 338px wide inside its grid.
- 🔴 **A MEDIA QUERY ADDS NO SPECIFICITY, SO A LATER PLAIN RULE BEATS IT AT
  EVERY WIDTH. MEASURED 2026-09-19, AND THE RULE IT KILLED HAD NEVER RUN.**
  `.pos-pick`'s entire phone layout sat in `@media (max-width: 560px)` at
  `shell.css:1589`, and the plain `.pos-pick { display: inline-flex; height:
  34px }` sat at line 2052. Same specificity, later in the file, so the plain
  one won at 390 px as well as at 1280, and the picker had NEVER collapsed on a
  phone in its life.
  ⚠️ **IT WAS FOUND BY PUTTING TWO CONTROLS SIDE BY SIDE AND MEASURING BOTH.**
  At 390 px the three choices went label on top at x=16 while `LOOK`'s segment
  started at x=53, after an inline label. One of them obeyed the stylesheet and
  one did not, which is visible in a screenshot and invisible in the source,
  because the source says exactly what the author meant.
  ⚠️ **THE FIX IS ORDER, NOT WEIGHT**: the media block moves after the section
  it overrides. Raising specificity to win a fight with your own stylesheet is
  how `.pos-faux` ended up needing `(0,2,0)`, and that one at least had a page's
  rule to beat.
  🔴 **AND A DEAD CSS RULE IS THE SECOND MOST EXPENSIVE KIND OF DEFECT HERE**,
  after a dead JavaScript guard, for the same reason: it reads as done. Three
  now, all measured rather than reviewed: this, `.pos-log { margin-top }` which
  was inert for as long as it existed, and `if (fullSupport() === 'none')` on
  `/weight/`, a branch comparing against a string that function never returns.
  **Point a browser at it and measure the COMPUTED value**, which is the only
  thing that knows which rule won.
  🔴 **FOURTH, 2026-09-19, AND IT IS THE ONE A SELECTOR CANNOT WIN: AN INLINE
  STYLE BEATS EVERY STYLESHEET.** `shell.css` has carried
  `.pos-vp[data-full] .pos-vp-stage { aspect-ratio: auto }` since full screen
  was built. `createVideoPanel` later gained an `aspect` option for `/stage/`'s
  film, written as `stage.style.aspectRatio = aspect`, so a panel given a shape
  could never give it up. `/making/`'s 1:1 picture box stayed square on a 16:9
  screen, its picture sat high, and `.pos-fsx` is `position: absolute` INSIDE
  that stage, so **the way out of full screen rode up there with it**. Reported
  as two separate faults because that is how it looks.
  ✅ **A COMPONENT THAT VARIES A PROPERTY PER INSTANCE SETS A CUSTOM PROPERTY,
  NEVER THE PROPERTY.** `stage.style.setProperty('--vp-aspect', aspect)` and
  `aspect-ratio: var(--vp-aspect, 16 / 9)`: per instance, and still reachable by
  a rule. Writing `el.style.x` from a component is writing a rule nothing can
  override, including the component's own stylesheet.

- 🔴 **`[data-thing]` MATCHES AN EMPTY ATTRIBUTE, SO CLEAR IT BY DELETING.**
  MEASURED 2026-09-19 in `video-panel.mjs`, which did `root.dataset.full = full
  ? fullMode : ''`. Every full screen rule is written `.pos-vp[data-full] …`,
  and an attribute selector matches on PRESENCE, so a panel that had been full
  **once** kept `border: 0`, `background: #000` and a stage with no aspect ratio
  for the rest of the page's life.
  ⚠️ **IT SURVIVED BECAUSE ENTERING IS WHAT GETS TESTED.** Every check anybody
  writes about a mode is about going INTO it; the state that is wrong is the one
  after coming back, and it reads as a design choice rather than a fault. Found
  by an assert that the panel took its own shape back, written for another
  reason. `delete el.dataset.x`, never `= ''`.
- **A long press on a control raises the iOS text LOUPE, and `user-select:
  none` does not stop it.** `-webkit-touch-callout: none` is the one that does.
  Photographed on `/keys/` and `/mirror/`: the magnifier over the piano keys and
  selection handles dragged across a readout. Controls and keys now carry it
  along with `touch-action: manipulation`, which also drops the 300 ms
  double-tap wait so a key sounds when it is pressed. Prose, readouts and the
  log stay selectable — copying a number out of those is a real thing to want.
  ⚠️ **AND A `<canvas>` IS NOT A CONTROL, WHICH IS HOW IT WAS MISSED FOR
  MONTHS.** The rule above was written on `button` and nothing covered the
  picture. PHOTOGRAPHED 2026-09-19 on `/blocks/`: the 3-D scene wearing a blue
  selection overlay with both iOS drag handles, one of them hanging below the
  canvas into the log. Instructed as *"3d scene nonselectable"*, and it is
  global rather than per page, because a canvas here is always a picture and
  nobody has ever wanted to select one. **The selection suppression is global,
  `touch-action` is NOT**: a canvas you drag to look around wants it off, and a
  canvas inside a page you scroll must not eat the scroll.
- **iOS 17.1 added `ManagedMediaSource`**, so `Hls.isSupported()` is now TRUE on
  iPhone. Any fallback written `if (!Hls.isSupported() && canPlayType(...))`
  silently stopped firing.
- **Prefer native HLS on all WebKit, and gate it on `ManagedMediaSource`.**
  `canPlayType('application/vnd.apple.mpegurl')` returns `"maybe"` in BOTH Safari
  and Chrome, so it cannot tell them apart — gating on its truthiness put Chrome
  on a path it cannot play. MMS is WebKit-only, so it is a capability test rather
  than a brand check. Measured on desktop Safari, same page, same 40 s: native
  advance 0.961x / latency 5.25 s / 0 errors, against hls.js 0.344x / 7.71 s /
  2 errors. **HEADLESS Chrome answers `"maybe"` too**, so the suite cannot tell
  the two paths apart: `replay`, `seek` and `flipper` all ran
  `video.src = <m3u8>` on a Chrome that cannot play it: dead picture, green
  suite, because their asserts were about decks and cue folds, not about frames.
  ⚠️ `seek` IS RETIRED (2026-09-16) and is at `archive/demos/seek-index.html`.
  All three now gate on MMS (2026-09-06). Grep for `canPlayType` before trusting
  any HLS page.
- **Safari can close a ManagedMediaSource under you.** Every buffer is dumped.
  MMS also gates loading via `startstreaming`/`endstreaming`.
- **`video.buffered` on MSE is the INTERSECTION of the source buffers.** With
  demuxed audio+video it reads 0.05 s while video holds 5 s. Never diagnose a
  "starved" player without splitting the tracks.
- **Native HLS has no recovery hooks** — no `liveSyncDuration`, no level capping,
  no `hls.latency`. Reload is the only lever, so watchdogs must be hand-built.
- **Audio-only LL-HLS is not lower latency on Cloudflare Stream — it is only
  smaller.** The audio rendition and every video rendition carry the same
  `PART-TARGET=0.5`, the same `PART-HOLD-BACK=1.5`, the same `TARGETDURATION=3`,
  and — the giveaway — the same INDEPENDENT cadence: 11 of 41 parts on BOTH,
  though every AAC frame is independently decodable and audio could mark them
  all. Measured with that packaging: audio-only 3.88 s against video-only
  3.82 s, the same, while the bytes go 418 kbps against 11.8 Mbps. What
  actually costs latency is running BOTH renditions at once (8.8 s on raw
  hls.js) — the demuxed intersection problem `low-latency-player.js` exists to
  fight. `tracks` asserts the packaging from the playlists, so the claim
  needs no stopwatch.
- **Cloudflare WHEP refuses a single-track offer.** One recvonly transceiver —
  audio alone or video alone — is `HTTP 400`, both ways, while video+audio
  negotiates in the same second. So "is audio-only WHEP lower latency" has no
  answer to measure on this provider; you cannot subscribe to it.
- **A latency target inside one keyframe interval is unreachable.** Cloudflare
  advertises `PART-HOLD-BACK=1.5` with a 2.0 s GOP, and only one part per segment
  is `INDEPENDENT`.
- **LL-HLS deliberately does not specify how a client picks its live position.**
  Every player invents a policy; that is why this tier is fiddly.
- **A live-edge part 404 is normal.** Separate it with a ceiling; do not silence
  it.
- **Cloudflare mints a new video UID on every encoder reconnect.** Cached media
  URLs 404 afterwards.
- **`-re` is a per-input ffmpeg option.** `-re -i a -i b` paces only `a`.
- **MoQ:** a relay cannot live in a Container (no inbound QUIC — dial-out only);
  IETF `moq-pub` does not interoperate with hang at the catalog layer; but
  browser→relay→browser works today at p50 ~20 ms, with no container and no Rust
  build.
- **MoQ on Safari is blocked for a good reason.** WebTransport shipped in Safari
  26.4 (macOS and iOS) and connects to Cloudflare's relay in 140 ms — but
  `@moq/net` blocks Safari by user agent (`safari: '<0'`) because of
  [WebKit 319818](https://bugs.webkit.org/show_bug.cgi?id=319818): the QUIC
  flow-control window never refills, deadlocking after ~16 MiB or ~7,600
  streams. MoQ opens one stream per group, so that is about two minutes.
  Bypassing it (`08-moq/?transport=force`) is worse than the bug report implies.
  Measured twice, 150 s each on desktop Safari: **6-8 frames total**, first
  stall at 20 s, and **a full page reload with a fresh WebTransport does not
  help** (7 frames then 8). The window refills at roughly one frame per minute
  rather than never. So "reconnect every N seconds" is NOT a workaround — a
  question the published bug report leaves open. Not the encoder either: Safari
  does VP8 720p realtime at 370 fps. MoQ on Safari is unusable today; Safari
  gets WHEP (25 ms measured) instead.
- **Cloudflare's MoQ relay has no WebSocket listener**, so the qmux fallback
  cannot help. `moq-relay` (self-hosted) does, via `[web.http] listen`.
- **An error string cannot tell "API absent" from "API blocked".** `@moq/net`
  emits the same "WebTransport not supported" either way, which is how a claim
  that iOS lacks WebTransport got made without anyone checking `typeof
  WebTransport` on the device. Report the capability, not the error.
- **ManagedMediaSource needs `disableRemotePlayback = true`** (or an AirPlay
  source alternative) or `sourceopen` never fires. There is no published
  low-latency guidance for MMS — native HLS is the documented low-latency path
  on WebKit, which is why the player prefers it there.

- **Stream recording cannot be turned off — ON THE RTMPS PATH.** `mode: off`
  also disables HLS playback of a live input, and `preferLowLatency` requires
  `automatic`, so 06 and 09 depend on it. **WHIP ingest is the opposite and the
  unqualified rule has already misled a plan once: WHIP RECORDS NOTHING** —
  direct-tested, 183 s against a recording-ENABLED input, 26 polls, zero assets.
  Stream-WebRTC is delivery-only, so a WHIP source costs no storage minutes and
  cannot be archived server-side either; whatever records it must do so itself. Storage is bounded by DELETING recordings; the account
  cap is 1000 storage-minutes and testing adds ~225/day.
  `deleteRecordingAfterDays` minimum is 30 — too coarse to help.
- **Stream bills MINUTES, not bytes, and from 2026-10-15 WebRTC bills too.**
  $1 per 1,000 minutes delivered on both protocols — "regardless of protocol"
  (GA notice 2026-09-08; this account delivered 246 WebRTC minutes in 30 days,
  ≈$0.25). Three consequences that are not the price. **Buffering is billable**
  and HLS minutes round up to the segment, which is the GOP — 2.0 s here — so a
  visitor who leaves after two seconds is billed for the ~3 segments hls.js
  prefetched (`liveSyncDurationCount: 3`, read from the bundled build) and for
  ~2 s on WHEP. **An idle broadcast costs nothing on WHIP and storage on
  RTMPS**, because recording cannot be turned off there. And **the 1000-minute
  cap blocks new live streams when it fills** — at ~225 min/day that is 4.4
  days, so the RTMPS path's real cost is an outage, not a bill. Because the
  meter is duration, `tracks`' 28x byte saving (418 kbps against 11.8 Mbps) is
  worth exactly $0 on this provider: audio-only is an argument for the viewer's
  connection, never for the account. Recording and HLS interop for WHIP are
  announced "in the coming months" and are NOT shipped — re-test before
  planning either way.
- **A Durable Object's OUTBOUND client WebSocket hands binary over as a
  `Blob`**, not an `ArrayBuffer` — measured `Blob`, `size` 9, `byteLength`
  undefined — and a `Uint8Array` binds to a SQLite `BLOB` column as an EMPTY
  one, silently. So a recorder can look like it stored a frame while the row
  reads back at 0 bytes with its hex head blank. `await data.arrayBuffer()`
  first, and bind the ArrayBuffer. A BLOB also comes back OUT as an
  ArrayBuffer, which has no useful `.slice()` and no iterator — wrap it before
  reading it. (`workers/backlog`, 2026-09-09.)
- **A DO's input gate does NOT cover a non-storage await.** Events are held back
  across a `storage.get`, so handlers cannot interleave there — but
  `blob.arrayBuffer()` is not storage, and two frames a millisecond apart will
  race each other into a table in the wrong order. Where order IS the product,
  serialise the handler through one promise chain.
- 🔴 **A full relay room is a silent outage, and a redeploy does NOT clear it.**
  `studio-1` sat at 16/16 and refused the board for hours — it logged
  `closed 1006`, which is what a browser reports for the relay's `503`, so it
  read as a network fault on the Pi while `/keys/` was down for everyone. The
  room was full of **orphaned harness Chromes of mine** (four profile groups,
  118 processes); killing them took it 16 → 1 and the board rejoined unaided.
  Hibernated sockets are RESTORED across a restart, so deploying the worker
  changes nothing — only the object can close a socket. It now reclaims idle
  ones **when the room is full only**, dating each from
  `getWebSocketAutoResponseTimestamp` (survives hibernation; `wire.mjs` clients
  ping and the runtime answers for free), an in-memory message time for agents
  that never ping, and a DURABLE `serializeAttachment({at})` written once at
  accept — because dating from the object's wake makes a dead socket
  un-evictable forever. `GET /room/<name>/stats` now prints per-socket idle.
  **Check `curl .../stats` before diagnosing any "cannot connect" on this
  relay**, and kill stray `user-data-dir=/tmp/...` Chromes.
- 🔴 **THE RELAY'S LIMITS ARE 1000 msg/s, A 2000 BURST AND 128 SOCKETS, AND
  THIS ENTRY SAID 60, 120 AND 16 FOR MONTHS AFTER THEY WERE RAISED.** READ from
  `workers/relay/src/index.js`, whose own comments say *"was 60 — one knob turn
  is ~60/s on its own"* and *"was 16, which a handful of browser tabs could
  fill"*; `GET /room/<name>/stats` reports the same. `demo/shell/wire.mjs`
  carried the same four stale numbers under a comment claiming it could not
  disagree with the worker, and was corrected on 2026-09-17.
  ⚠️ **THE DIRECTION MATTERS.** Every stale number was too SMALL, so anything
  reading them refuses work the relay would accept and any capacity argument
  built on them understates a room by more than an order of magnitude. A design
  was nearly throttled on this: a keyboard glissando and a held retrigger were
  budgeted against 60/s and come to about 16 and 8 msg/s, which is under one per
  cent of the real budget.
  **What is still true and is the part worth keeping:** the token bucket is
  readable off the wire and exact, and the sender is told NOTHING when it bites.
  No error, no close, no backpressure, and only a per-connection counter in the
  payload can see it. ⚠️ A gap counter cannot: a flood measured on 2026-09-17
  delivered 2030 of 6000 and reported `lost 0`, because the loss was a tail
  rather than a hole. The Durable Object hop costs **1-2 ms at p50** over the
  runtime's `ping`/`pong` autoresponse, and a full room costs the sender about
  **8 ms at p50** over an empty one with zero loss (`demo/perf-wire.mjs`).
- **`ingest.positron.studio` is the only tokenless write path.** Server-minted
  session ids, per-segment/session/address caps enforced in a DO, 6-hour TTL
  with a cron sweep. `selfrec` stays token-gated; keep the two separate.
- **MediaRecorder output reports `duration: Infinity`**, which leaves a
  transport bar with no range to scrub. Seek far past the end, let the browser
  resolve the duration, then come back.
- **The same suite read 425/429 and then 429/429, forty minutes apart, with no
  code between them.** All four failures were `now`, all downstream of frames
  never arriving, and a single two-byte range GET on the live edge segment
  answered **403 with no ACAO** while the playlists beside it were fine. So
  before treating a red `now`/`flipper` as a regression, ASK ERR — one range
  request separates "our code broke" from "the schedule moved", and they look
  identical from the harness.
- **ERR blocks live segments by PROGRAMME, not by age.** The playlists are open
  (200 + `access-control-allow-origin: *`), the segments under `/live/hls/` can
  be 403 with NO ACAO — which reaches a browser as a CORS failure, so hls.js
  holds an empty buffer and the cell just stays black. Swept at 13 points
  across each 2 h window on 2026-09-06: `etv` refused its newest ~45 min,
  `etv2` refused its OLDEST ~78 min and served the edge, `etvpluss` served
  everything. It moves with the schedule and it is not always at the edge, so
  there is no offset to hard-code. A served segment honours Range, so a 2-byte
  GET asks "will you serve this one?" — `flipper` sweeps back from the edge,
  starts where ERR will serve, and puts the refused minutes in its readout.
- **A remote `MediaStream` carries the SENDER's msid.** After a hop,
  `remote.id === local.id` and the track ids match too, so "is this the received
  stream or the source?" cannot be answered by id — it is answered by object
  identity against `pc.getReceivers()[i].track`. An id comparison passes
  vacuously in both directions.
- **`candidate-pair` RTT is not media latency.** Quoting WHEP's 25 ms RTT
  beside MoQ's 20 ms glass-to-glass flattered WHEP by ~3x. Measured the same
  way: MoQ p50 26.2 ms, WHEP p50 67.0 ms, and WHEP wins p99.

- 🔴 **A READOUT HAS AN EVEN NUMBER OF CELLS, AND AN ODD ONE IS CUT, NEVER
  PADDED.** ⚠️ **THE REASON GIVEN HERE WAS WRONG AND THE RULE SURVIVES ANYWAY.**
  It used to say the row is `repeat(auto-fit, minmax(96px, 1fr))`, so a phone
  gets two columns and an odd count leaves a HOLE in the last row. MEASURED on a
  real page 2026-09-13: 96 px plus a 1 px gap gives **three** columns from about
  353 px of content upward, which is every phone anyone owns — so a **4-cell**
  readout holed from 353 to 426 px (iPhone SE 375, iPhone 12–15 **390**, Pixel
  412) and a **6-cell** one holed from 427 to 620, four slots wide at 560. An
  even count guaranteed nothing above two columns, and four-cell readouts had
  been holing on the commonest screen there is. The row is **flex** now, so the
  last row's cells GROW to fill it at every width and every count — verified at
  thirteen widths, both counts, all filling.
  So the even rule is now **editorial, not structural**: an odd readout always
  has a weakest cell, and being made to find it is the point. `mount()` still
  throws. The hole it used to describe is gone. A blank filler is the wrong repair: it adds a
  thing to look at that says nothing. Trimming is the right one, because an odd
  readout always has a weakest cell — usually a constant (`llhls`' `target`,
  `rack`'s 50/s `rate`, `moq`'s `version`) or something a neighbour already
  implies (`wire`'s `round trip` beside its `delivery`). Twelve pages were odd
  when this landed and every one got better. `mount()` THROWS on an odd count.
- **Nothing unmeasured prints as `0`, and never as a lone unit.** `''`, `null`
  and `NaN` all become an EMPTY cell with the unit hidden.
  ⚠️ **THIS SAID "ONE EM DASH" UNTIL 2026-09-18 AND THE CODE HAS SAID OTHERWISE
  SINCE 2026-09-13.** `setCell` renders `''`. The placeholder WAS an em dash and
  was removed on the reasoning written beside it: a cell does not have to show
  that it is a cell, because the key above it and the box around it already say
  so, and four dashes in a row read as four failed readings rather than four
  cells waiting. Two copies of the old wording survive in `/kit/`. An empty string used to
  empty the cell and leave the unit standing alone — a `%` with no number in
  front of it, which reads as a value that went missing — and a page that
  pre-sets a counter to 0 is worse, because a zero reads as a very confident
  measurement of nothing.

## Assert both modes, and watch the assert COUNT

A demo that branches must assert every branch on every run. Adding a uniform
mode to grid silently dropped it from 11 asserts to 10 while still reading
green — and worse, because `verify.mjs` presses every control the toggle was ON
at check time, so only 6 of that page's 8 asserts ever ran in the suite.
(grid no longer branches: one grid, one quality, 8/8 run.) Diff per-demo
counts against the last known total after any change.

## Two shared things that are not per-page, and bit

🔴 **ONE FCM TOPIC MEANS ONE ROOM MAY USE IT.** `workers/items` gives every room
its own Durable Object — `idFromName(room)` — and `verify.mjs` gives every run
its own room, so runs cannot see each other's rows. The one thing that was NOT
partitioned was `env.FCM_TOPIC`, so **every run of the suite sent two real
notifications to every real subscriber**, for a day, before anyone outside said
so. Announcing is an allowlist of ONE room now (`items`) — ⚠️ not a prefix test,
because refusing rooms that LOOK like test rooms lets the next non-real room
through by default and the default has to be silence. ⚠️ The object has to be
TOLD its own room and remember it: the alarm fires with no request, and
`idFromName` tells an object nothing about its own name. **When a resource is
shared and everything around it is partitioned, ask who owns the sharing** — the
bug was a fact true of every part and of no part's author.

🔴 **THE NEWEST COMPONENT GOES AT THE TOP OF `/kit/`, AND ITS HEADING IS
UPPERCASE.** Instructed 2026-09-16: *"in kit move online stuff to topmost item
(all new should land top, make rule)"* and *"always uppercase"*. That page is
read by somebody checking what the kit has, and what they do not know about is
what arrived since they last looked; appending put the newest thing at the
bottom of a long scroll, behind everything they already knew. The front page
settled the same question the same way. `.kit-h` renders a heading uppercase
whatever is typed, so type it uppercase and the source reads like the page.
⚠️ **A BLOCK THAT MOVES TAKES WHAT IT NEEDS WITH IT.** Moving one to the top
left its `const` behind, so the build read it in its dead zone, `section()`
swallowed the throw into `failed`, and the page died much later on an empty map
with a message about a different line. The page reported `this block did not
build` to a reader before the suite did.

✅ **`/kit/` IS MACHINE-GRADED NOW, AND THIS LINE SAID OTHERWISE FOR WEEKS.**
It used to say the page carried no `mount()` and no asserts, so the one page
whose whole job is to make component drift visible was the one page the suite
could not see, and anything demonstrated there had to be measured another way.
`node demo/verify.mjs kit` is **22/22** with 15 page asserts, and they are the
kind only that page can make: a badge measuring the same width in all four of
its states (spread 0.02 px), an animation that touches opacity and nothing that
could move a neighbour, two greys told apart by ink rather than hue, an
embedded dot laying out 8.0 px and still saying its state in words.
⚠️ **THE LESSON IS ABOUT THIS FILE RATHER THAN ABOUT THE PAGE.** A rule that
tells an author their work cannot be graded is a rule that stops them trying,
and this one outlived its own truth. A claim here about what a harness can do
is checkable in one command, so check it before repeating it.

## Conventions

- 🔴 **A FINISHED PAGE IS HANDED OVER AS A URL, NOT AS A PATH.**
  `demo/radio/index.html` is not an answer to *"where is it"* — it is the
  answer to *"which file did you edit"*, and the reply to a working demo that
  gives one was **"useless to me"**. Say where to OPEN it:
  **a deployed `https://positron.studio/<slug>/` if it is deployed, otherwise a
  live local URL with every query parameter it needs to work** — and the server
  behind it still RUNNING, not one killed three commands ago. ⚠️ A page that
  needs a local worker as well needs BOTH up and both named, in one line that
  can be clicked: `http://127.0.0.1:8890/radio/?base=http://localhost:8899`.
  If it cannot be reached at all yet, say that in those words and say what is
  missing — an unreachable page reported as done is worse than one reported as
  blocked, because only one of them gets fixed.

  🔴 **AND THE RULE HAS TO SURVIVE BEING RELAYED — THIS IS HOW IT BROKE, TWO
  HOURS AFTER IT WAS WRITTEN, BY ITS OWN AUTHOR.** Neither agent was careless
  about its OWN page: both handed over full URLs for those. Both wrote a bare
  `/radio/` for the OTHER one's, because between two agents a slug is
  unambiguous and it never occurred to either that the message would be read by
  a person who then has nothing to click. The user's reply was *"what it WENT
  OUT? urls! how many times i am asking"*.
  **Resolve every slug to a URL before it leaves, including one you are quoting
  from somebody else.** A relayed path is still a path, and the reader at the
  end of the chain is the one who cannot use it.

- Demos are `demo/<slug>/index.html`, deployed at `/<slug>/`. **A demo's identity
  is its slug and its ORDER is its position in `DEMOS`** — there is no number in
  the directory, the URL, or the page. There used to be, in five places at once,
  and keeping them in step is what made reordering expensive enough to get
  wrong: the 05/28 swap left one page still declaring its old number inside its
  own `mount()`, which only the full sweep caught. Moving a demo is now moving a
  line in the array. `built: false` hides one from the index.
- Every demo mounts the shell (`demo/shell/shell.mjs`) and publishes
  `window.__demo` — human-openable and CDP-drivable from the same page. Assert on
  `__demo`, never on DOM ids.
- Shared demo code goes in `demo/shell/`, which `build.mjs` **enumerates**. It
  also refuses the build when an import has no deployed file, and when two
  sources collide on one destination. **It scans modules, not just pages** — it
  read HTML only until 2026-09-07, and in that gap `demo/shell/moq.mjs` kept
  importing `/08-moq/moq-vendor.js` across the slug rename: a 404 that killed
  the module, so `moq` and `ladder` asserted NOTHING and read red for a reason
  that was true but not theirs (no relay on this network). **A rename moves
  URLs that live in modules, harnesses and comments, none of which are
  type-checked — grep the OLD form everywhere.** The same rename left
  `verify-native.mjs` pointed at a 404, which is the iPhone path.
- **What a demo REQUIRES is read off its `tags`, never listed twice.**
  `demo/shell/caps.mjs` maps a tag to a capability (`WebGL2` -> `webgl2`,
  `getUserMedia` -> `camera`), probes this browser once, and un-links rows the
  browser cannot run **with the reason in words** — a vanished row says the
  demo does not exist, which is a different and false statement. Three rules
  the file exists to hold: it is a **capability test, never a user-agent
  check** (a headset browser is Chromium, and research/quest-xr §1.7 measured
  that a Quest 3 and a 3S are indistinguishable by UA); a probe that could not
  answer returns **`unknown`, which never blocks**, because "we did not look"
  must not read as "it is missing"; and `midi` is deliberately soft, since
  `instrument` keeps playing from its on-screen keys. Proved by breaking it:
  the same page under `--disable-gpu` un-links `mirror` with *"this browser
  draws no 3-D"* and links it with the GPU on.
- **The generated test picture is `demo/shell/pattern.mjs` and nothing else.**
  Six demos draw it and `src/publish.sh` generates its ffmpeg filter by calling
  it; `workers/pub/container/server.mjs` holds a marked copy because that image
  is one `COPY` with nothing to import — change one, change the other, and diff
  the y/size/colour table afterwards. **After ANY move of `ROW`, re-run burn →
  `readBurned`** (600/600 exact through three moves); it is the only thing
  between a layout tweak and a stream nothing can read. The field is NEVER
  tinted — a warm hue at low saturation and low lightness is mud at any alpha —
  so colour lives in the labels, the sweep square and the strip lane, inside a
  100° band on `--hi`. One `PAD` off every edge. A camera is CONTAINED, never
  covered or stretched: iOS ignores a resolution request and returns portrait,
  where stretching squashes a face and cover shows 32% of the frame.
  ⚠️ **AND A FILM IS NOT A CAMERA: `drawCamera` TAKES `fit: 'cover'` SINCE
  2026-09-18**, asked for on `/stage/` as *"make 4:3 video win and crop"*. The
  rule above is unchanged and is still the DEFAULT; what it is about is a
  subject somebody framed and a shape the page does not control, and neither is
  true of a film composed to fill its own frame. The arithmetic said the same:
  a camera at 720x1280 into 1280x720 keeps 32%, the 4:3 film that bought this
  option kept **75%**, and contain was laying 160 px of flat field down each
  side of it. **`scrim` is a second option and defaults to the same 0.55**: it
  exists so a burned clock stays readable on top, so a caller that draws nothing
  on top passes 0 rather than dimming its own picture by more than half for
  furniture that is not there. `/stage/` is the only caller of either; the five
  camera pages take the defaults and read 82/82 unchanged.
  ⚠️ **THE 4:3 FILM IS GONE SINCE 2026-09-19 AND THE RULE IS NOT.** That page
  plays a 1280x720 MIMproject recording in a 1280x720 box now (*"video win to
  16:9"*), where `cover` and `contain` agree to the pixel, so the one live
  caller no longer demonstrates the option it asked for. It still passes
  `cover`, for the reason above and because `?bg=` can point it at a corpus row
  that is 4:3 or 480x272. **The numbers above are kept as the measurement that
  bought the option, not as a description of what is on screen.** This entry
  said `a 4:3 film keeps 75%` in the present tense for as long as that was
  true, which is how a confident sentence outlives the thing it describes.
- 🔴 **AND A PAGE NEVER RE-PUBLISHES `__demo.transport`, BECAUSE THE BAR
  ALREADY DID AND THE RETURN VALUE IS NOT THE SAME OBJECT.**
  `transport-bar.mjs` publishes its internal `api`; `createTransportBar` returns
  a WRAPPER around that api. A page that assigns the return value over the top
  hands the harness an object with no `position`, and `demo/verify.mjs` dies on
  `t0.pos.toFixed` while the page itself looks perfect. Found 2026-09-19 on
  `/making/`. The two objects being different is deliberate and is not the
  defect; assuming they are the same is.
  **The exact shape, so nobody has to re-derive it**: `createTransportBar`
  returns `{ el, api, endStop, commanded, extra, loopExtra, slot, note, destroy
  }`, and `publish: true` writes `api` to `__demo.transport`. `verify.mjs` reads
  `__demo.transport.position` and `__demo.transport.el`, and both live on `api`.
  ⚠️ **THE SYMPTOM IS THE WORST KIND**: the harness THROWS inside its own drill
  rather than failing an assert, so the output names the harness and not the
  page, and nothing in the per-page count moves to point at what changed.
- 🔴 **A PAGE WITH TWO BARS MUST SAY WHICH ONE IS ITS TRANSPORT: `publish:
  false`.** `__demo.transport` is the only handle a CDP check has, and every bar
  claimed it unconditionally, so it was whichever bar was BUILT LAST, which is a
  fact about source order rather than a statement about the page. `/stage/` grew
  a second on 2026-09-18 (a live show in the control room, a recording in the
  archive) and the wrong one won by being further down the file.
  ⚠️ **AND THE DRILL PRESSED A DIFFERENT BAR FROM THE ONE IT GRADED.**
  `verify.mjs` clicked `document.querySelector(".tbar-toggle")` while every
  assert around it read `__demo.transport`: the same element only while a page
  has exactly one bar. DOM order and build order are routinely different on a
  tabbed page. It presses `__demo.transport.el`'s own toggle now, and `el` was
  added to the api object for it, which the file's own comment already demanded:
  a control reachable from the return value and not from `api` is a control the
  harness cannot press.
- Transport UI is `demo/shell/transport-bar.mjs` and nothing else. Playhead from
  `observePosition`, seek only via `deck.seek()`, rates from intersected
  `caps.rates`.
- **One meaning for colour across every demo.** A mark's colour says HOW IT
  LANDED, never which lane it is in — lane identity is the row, the label and
  the gutter swatch, three channels that already carry it. Grey = not played,
  slate = played and this lane cannot say how well, green = inside what its way
  of firing promises, amber/red = later. "Played, unmeasured" gets its own
  colour rather than borrowing green: colouring an unchecked thing as if it
  passed is an assertion nothing made.
- **A number belongs to the lane that can answer for it.** Report each lane's
  error against the score, not against another lane; every pairwise gap is a
  subtraction away. Give every lane a row even when it has nothing to say, and
  let it say so in words — a blank cell collapses "we did not look" and "we
  looked and it was fine". Never let a lane with no feedback count as 0 in an
  aggregate: it must not be able to improve the score.
- **A count is only evidence on the far side of the boundary.**
  `createMidiLane`'s `scheduled()` counted what the page QUEUED and read
  identically to delivery — while every note was being scheduled fifty-six
  years out. Ask which side of the wire a counter is counted on before quoting
  it.
- **A background agent must not commit.** `git add -A` in a shared checkout
  sweeps another agent's in-flight work into an unrelated commit. It happened
  twice in one session: `timeline/score.mjs` and `csound.mjs` — the whole score
  container — landed inside a commit about `loops`, and `04-score/index.html`
  inside one about a plan document. The code was right and the history lied
  about it, which is worse than either being wrong on its own, because a reader
  doing archaeology trusts the message. Repaired with `git notes` rather than a
  rewrite, since one agent still held uncommitted work in a file the rewrite
  would have touched. **Agents report; the session commits.** And when a commit
  must be made while an agent is running, stage the paths by name — never

  🔴 **AND STAGING BY NAME IS NOT ENOUGH WHILE A `git mv` IS STAGED. MEASURED
  TWICE IN TEN MINUTES, 2026-09-19.** `git mv` STAGES the rename as it makes it,
  so the index already holds somebody else's work before you touch it. A peer
  session ran a plain `git commit` of its own file and swept all five paths of
  an in-flight `/held/` to `/weight/` rename into a commit whose message was
  about something else entirely, which is the exact failure this rule exists to
  prevent, arriving from a direction the rule did not cover.
  **The form that is safe is PATH LIMITED, not staged by name:**

```sh
git commit -F msg.txt -- demo/making/index.html      # only these paths, whatever else is in the index
```

  The repair, if it has already happened, is `git reset --soft HEAD~1` and then
  the path-limited commit. ⚠️ **AND CHECK RATHER THAN ASSUME**: `git status`
  showing your own file staged says nothing about what else is in there, and a
  `git mv` leaves renames looking like `R078` rather than like edits.  `git add -A`.
- Secrets never reach a log. The publisher redacts at the point of capture, so a
  secret split across two stderr chunks is still caught.
- 🔴 **NO EM DASHES. ANYWHERE A READER LOOKS.** Not in `what`, not in a
  readout key, not in a diagram note, not in a log line, not in a commit
  message, not in a reply. They are a tic: an em dash lets a sentence bolt a
  second clause on instead of ending, and the bolted clause is almost always
  the vague one. The sentence that prompted this rule was *"It answers HTTP/1.0
  on port 8001 and never over TLS — which is the fact everything to the right of
  it exists to work around"*, and the half after the dash says nothing a reader
  can use. Use a full stop and write the second sentence properly, or a colon
  when the second half really is the first half named. ⚠️ THE TEST IS NOT
  PUNCTUATION, IT IS WHAT THE CLAUSE DOES: if it qualifies, gestures, or
  re-states, cut it; if it carries a fact, it deserves its own sentence.
- 🔴 **AND NO MIDDOTS EITHER, WHICH IS THE SAME RULE ABOUT THE CHARACTER THAT
  REPLACED THE DASH.** Instructed 2026-09-19: *"avoid using middots in ui (can
  be fixed per demo as we go)"*, and pointed at again a minute later on a panel
  footer reading `Apple GPU · locked 59.9 fps`. The em dash sweep moved 418
  joins onto `·` and `shell.mjs`'s own comment called it *"already this
  project's separator"*. That is how a tic survives a rule: it changes costume.
  A middot lets a line bolt a third and a fourth fact on exactly the way a dash
  bolts a second.
  ⚠️ **A ROW OF FACTS IS CELLS, NOT ONE STRING WITH GLUE IN IT.** That is the
  repair almost every time. A footer joining `picture`, `fps` and `locked` with
  `' · '` had three cells and threw them away to make a sentence; the readout
  already knows this and so does `table.mjs`. Stop gluing rather than choosing a
  different glue.
  ⚠️ **AND IT IS PER DEMO, NOT A SWEEP.** MEASURED on the day the rule was
  written: **971** middots across `demo/*/index.html` and `demo/shell/*.mjs`, in
  **45 of 46** pages. A page loses them when that page is being worked on, which
  is what was asked for. The shared ones are different and are decided once:
  the assert formatter, the tally line and `document.title` are all in
  `shell.mjs` and reach every page.
- 🔴 **A DIAGRAM IS WRITTEN TO A DIFFERENT RULE FROM PROSE, AND HERE IT IS.**
  - 🔴 **THE VISITOR'S MACHINE IS CALLED `Browser`. ALWAYS THAT WORD.** Not
    `your device`, not `this page`, not `here`. It is the name of the thing, a
    reader meets it on more than one diagram, and a name learned once should
    not be re-learned per page. The same goes for the other machines: `Cloudflare`,
    `Icecast`, `ffmpeg` are what those things are CALLED.
  - 🔴 **A CONTAINER TAKES NO `note`.** A box holding other boxes is a machine,
    and its name and the boxes inside it already say what it is. A paragraph on
    it repeats the children underneath it and is read before them, which is the
    wrong order. Notes belong on the boxes that do something and on the arrows
    between them. Reported as noise on three containers at once.
  - 🔴 **A DIAGRAM OPENS A SECTION AND SITS 44 px BELOW WHAT PRECEDES IT.**
    Not the body's ordinary 22 px rhythm: a picture of the machinery is a new
    part of the page, the way `.pos-how` already is. The number is declared once
    in `shell.css` on `.pos-body > .pos-dg`, so a page that brings its own
    `title` and a page that uses the standing heading cannot end up at two
    distances, which is exactly what happened and was spotted by comparing two
    pages side by side.
  - 🔴 **IT GOES LAST ON THE PAGE, AND IT PASSES `how: true` AND NO `title`.**
    A diagram is REFERENCE: it is read once, on purpose, by somebody who has
    already pressed the thing and wants to know what is behind it. Put between
    the page's sentence and its controls it delays the only thing a first
    visitor came for, and it makes the page look like documentation with a demo
    attached. Under the controls and the readout it is exactly where somebody
    who now has a question will look for one.
    🔴 **EVERY DIAGRAM PASSES `{ how: true, atEnd: true }` AND NO `title`, AND
    THE HEADING IS `How it works`, WHICH LIVES IN `diagram.mjs` AS `HOW`.**
    Never typed on a page. A page that passes a `title` alongside `how` gets it
    REFUSED and reported on `cuts`, because `/station/` once shipped two
    headings stacked.
    ⚠️ **THE WORDING WAS `How this works` AND WAS CHANGED ON A DIRECT ASK,
    2026-09-16.** `it` is the settled English phrase, a reader recognises it
    without parsing, and on these pages `it` ALREADY means the demo because
    every `what` paragraph uses it that way. `this` pointed at something
    position already makes unambiguous: the picture is last on the page it
    belongs to.
    ⚠️ **AND THE DRIFT THIS PREVENTS WAS REAL AND MEASURED, NOT HYPOTHETICAL.**
    On the day the rule was written there were THREE treatments across six
    pages: four passed `how: true`, `/crate/` typed its own lowercase title, and
    `/grains/` drew into `d.head` with no heading at all, so its picture came
    first. All six are uniform now. This line itself said `title: 'how it
    works'` for weeks while the code said otherwise, and an agent working from
    this file is what caught it.
  - 🔴 **A PAGE WITH A DIAGRAM HAS A ONE LINE `what`, AND IT IS THE INDEX'S OWN
    LINE.** A paragraph and a picture of the machinery are two explanations of
    one thing and the paragraph is the weaker of them: it describes what a
    reader can point at an inch below. Use the `one` line from `manifest.mjs`
    verbatim, so a visitor arriving from the index is not told the same thing
    twice in two wordings that can drift apart.
  `demo/shell/diagram.mjs` draws it; these decide what goes in it.
  - **A box label is a NAME.** `Icecast`, `scsynth`, `speakers`.
    ⚠️ **AND A DIRECTION IS NOT A NAME.** `/keys/` split one relay into two boxes
    by role and labelled them `notes out` and `sound back`, which are captions
    saying which way the traffic goes. Reported as *"not good names"*. Where one
    machine is drawn twice by role, the LABEL is what that half carries
    (`notes`, `audio`) and the `sub` is what the thing IS (`Relay object`, the
    Durable Object's own class name). The direction is already in the arrows. It has to fit
    the box at the width the layout gives it, which is about fourteen
    characters, and a label that gets cut is reported on `cuts` for the author
    to fix rather than ellipsised at the reader.
  - 🔴 **NO ARTICLE IN A LABEL. NOT `a`, NOT `an`, NOT `the`.** A label is a
    NAME and names do not take articles: `a granulator` and `an item` read as
    the start of a sentence somebody did not finish, and on an arrow they are
    worse, because `a banner` and `the same` are the two halves of a caption
    that is not there. Drop the article and what is left is either a good label
    or a bad one that was hiding behind it: `a granulator` becomes `granulator`,
    `an item` becomes what actually travels (`POST /items`), and `the same` was
    never a label at all. ⚠️ THE `sub` AND THE NOTE ARE DIFFERENT: those are
    prose and take articles normally.
  - **The `sub` is what KIND of thing it is**, in three or four words:
    `port 8001`, `SuperCollider`, `25 Hz, OSC`. Never a second sentence.
  - 🔴 **A QUANTITY IN A `sub` OR A LABEL IS WRITTEN SHORT: `10s`, NOT `ten
    seconds`.** Reported 2026-09-16 on `/station/`, which read `R2, ten
    seconds`. A sub has about fourteen characters of room and a number spelled
    out spends nine of them on a value a digit carries: it is the one place on
    a page where a figure has to be read at a glance, in a box, next to another
    box. `10s`, `2h`, `128k`, `16ms`, `500KB`, `90fps`. ⚠️ THE `note` IS
    DIFFERENT and takes ordinary prose, because it is a sentence read on hover
    with room for one. And this is about DIAGRAMS: a readout cell already has
    its own rule, and a `what` paragraph is prose.
  - 🔴 **THE `note` IS TWO SENTENCES. NOT THREE, AND NEVER SIX.** It is read
    once, on hover, under the picture, and it should say what a reader CANNOT
    see: why this box is here, what it does that the name does not imply, the
    number that matters. It must never repeat the label, which is on screen an
    inch away. `createDiagram` reports anything over about forty words on
    `cuts`, the same way it reports a label that did not fit.
  - 🔴 **AND NOTHING ABOUT HOW THE PICTURE WAS MADE.** The note that bought this
    rule ended *"What feeds the server is not visible from outside it. The
    titles that arrive look like filenames, so something is playing files into
    it, but that is a guess and no box is drawn for a guess."* Every word true,
    and it is the author talking to himself about his own drawing in front of
    somebody who asked what a radio station is. Reported as **"awful slop with
    no audience"**. There is no audience for what you considered, what you could
    not determine, what it used to say, or why you stopped. If a thing is not
    known, leave it out; the absence of a box already says so.
  - 🔴 **A NOTE NAMES THE TECHNOLOGY. THE NO-JARGON RULE WAS DIALLED TOO FAR
    BACK AND THIS IS THE CORRECTION.** A note saying a box "rides the station's
    loudness and changes the synth twenty-five times a second" describes an
    effect and names nothing a reader could look up, search for, or recognise.
    `setInterval`, `AudioContext`, `Lag.kr`, `MediaRecorder`, `allow-origin`,
    `Icecast` are what those things ARE CALLED, and a note is exactly where they
    belong: it is read once, on purpose, by somebody who pointed at the box
    because they wanted to know what is in it. The banned words were always the
    PRIVATE vocabulary of this project (a fold, a lane, an evidence gate, a
    horizon), never the public names of real technology. When a note could be
    describing any of four implementations, it is not yet a note.
  - **An arrow's label is WHAT TRAVELS**, not what the step is called:
    `128 kbit/s`, `OSC /n_set`, `grains`. Its note says what that actually is.
  - 🔴 **NO FILE PATHS AND NO WARNING EMOJI IN ANYTHING A VISITOR READS.**
    `shell/icy.mjs` in a note tells a visitor nothing and tells a reader of the
    code something they could have grepped; ⚠️ in a sentence under a picture is
    an alarm about a fact that is not alarming. Both belong in comments.
    ⚠️ **AND THE LOG BOX IS SOMETHING A VISITOR READS.** `items` shipped a
    ⚠️ at the head of a log line about Focus modes. The line was worth saying and
    the emoji made an ordinary fact look like a fault on a page whose log is
    where real faults are reported, which is the one place a false alarm costs
    something. A path, a warning emoji and a file name are all the same mistake
    in a log line as in a note. This applies to prose in a code comment too when
    it is quoted into a page.
  - 🔴 **BOXES INSIDE ONE MACHINE ARE JOINED WITH AN ARROWHEAD, LIKE EVERY
    OTHER LINE IN THE PICTURE. THIS REVERSED ON 2026-09-16 AND THE OLD RULE IS
    BELOW SO IT IS NOT RE-ARGUED.** Instructed with a screenshot of `video`,
    `cue log` and `timeline` joined by bare lines: *"need arrowheads between
    inner boxes (make it a rule)"*.
    ⚠️ **WHAT THE OLD RULE GOT RIGHT AND WHY IT STILL LOST.** It said a head
    claims an ORDER between the parts of one program that the drawing does not
    know, and a tie is a bracket meaning only "these are parts of one thing".
    That is true and it is not what a reader sees. A headed line, then a
    headless one, then a headed one down a single column reads as **a head that
    fell off**, which was REPORTED on `/station/` and then again on `/replay/`.
    A convention only works if it is legible, and this one was being read as a
    bug every time it appeared.
    🔴 **THERE ARE THREE ANSWERS, NOT TWO, AND A CONTAINER PICKS ONE.** An
    ARROW is the default and says these boxes feed each other. `set: true` draws
    a BRACKET and says they are parts of one machine. `join: false` draws
    NOTHING, and is right where the container's own box already carries the
    whole relationship: `/keys/`'s `Browser` holds a keyboard and a playout, and
    a line between them adds no fact, it just gives the eye something to follow
    that leads nowhere. Asked for on sight: *"no connections between
    keyboard/playout and and notesout/soundback"*.
    🔴 **A RETURN PATH NEEDS `back: true` AND IT IS AN AUTHOR FLAG.** Nothing
    infers it. A link without it is laid out as a forward step, so a right to
    left link is drawn through whatever stands in the way: on `/keys/` it ran
    straight through `playout` and put its head on the far left of the Browser,
    reported as *"what is this thing on left of playout?"*.
    ⚠️ **AND A RETURN PATH LANDS ON THE BOX, NOT ON THE MACHINE AROUND IT.**
    Fixed 2026-09-16 after *"capture should conntect to sound back and that
    should connet to playout"*: back links attached to containers while forward
    links attached to boxes, so the two halves of one picture disagreed about
    what a link connects and only the return half was wrong.
    🔴 **`set: true` IS THE ESCAPE HATCH FROM THE HEAD, AND IT IS THE ONLY
    CASE THE OLD RULE SHOULD EVER HAVE COVERED.** A machine whose children
    really are a SET rather than a chain declares it and gets brackets back.
    `/station/`'s `studio` holds a live mount and recordings that already exist,
    and neither produces the other; its `Cloudflare` holds two buckets side by
    side. Both say `set: true` and the page asserts `dg.ties === 2`.
    ⚠️ **A DECLARED LINK IS UNAFFECTED EITHER WAY**: it replaces the connector
    in that gap and has always had a head. `set` decides only what an
    UNDECLARED gap between two neighbours looks like.
    ⚠️ **AND IF YOU ADD A FLAG LIKE THIS, CARRY IT TO THE RENDER NODE.** `box()`
    builds a fresh object rather than spreading the spec, so `set` was invisible
    to the painter and read as an option that did nothing. It cost two runs.
    🔴 **A DECLARED LINK BETWEEN TWO OF THEM IS DIFFERENT, AND IT REPLACES THE
    TIE RATHER THAN BEING DRAWN OVER IT.** The reasoning above is about what the
    DRAWING knows; where the author writes `{ from, to }` between two children,
    the direction has been stated, so the tie has nothing left to add and the
    arrow takes its place. Never both: two lines down one gap is exactly the
    confusion a return path runs under the row to avoid.
    🔴 **AND IT TAKES NO LABEL. THE DIRECTION IS THE WHOLE MESSAGE.** The gap
    two stacked children share is sixteen pixels tall and half a box wide, so a
    name in it either runs under both boxes or shrinks below the point of being
    read. **What travels goes in the link's `note`**, which is read on hover in
    the line under the picture, where there is room for a sentence. A `label`
    written on one anyway is reported on `cuts` and not drawn, because an author
    who cannot see their own label has no way to know where it went. ⚠️ The rule used to
    end "if two children really do feed each other in a way worth drawing, they
    are two machines, not one", and that was wrong in the one case it was
    tested on. `/station/` groups seven boxes into three machines, and four of
    its seven arrows are between boxes on ONE of them: R2 to R2, a schedule to
    the Worker that reads it. Ungrouping them to get the arrows back loses the
    fact the picture exists to carry, which is who runs what. `createDiagram`
    routes them now: in the gap two neighbours share, or in a lane inside the
    container for one that reaches past the box between them.
    🔴 **AND A LINK IT STILL CANNOT ROUTE IS REPORTED ON `cuts`, NEVER DROPPED.**
    This is how three real arrows went missing from that page for two sessions:
    they were refused with a `console.warn` nobody was reading, the ties stood
    where they should have been, and the picture looked complete while claiming
    a chain that does not exist. A link from a container to a box inside ITSELF
    is the one case left, and it says so in writing.
  - **Labels sit top-left** (`BOX_ALIGN` in `diagram.mjs`, one switch, so the
    whole project reverts together). Centred puts two boxes' names at two
    heights for a reason nobody can see.
- 🔴 **A CHANGE IN WHAT A PAGE DOES IS A CHANGE TO WHAT IT SAYS — IN THE SAME
  COMMIT.** `what`, the `one` line in `manifest.mjs` and every readout key are
  part of the page, not documentation about it, and they go stale silently:
  nothing type-checks a sentence, no harness reads it, and a description that
  has drifted is worse than a missing one because a visitor believes it. The
  trigger is not "did I rewrite the page" — it is **did a control appear or
  disappear, did a readout cell change, did the thing it is pointed at move, did
  the way you work it change**. Radio1965's paragraph described a Synthesize
  button for two sessions after the button was deleted. ⚠️ AND A CHANGE IS AN
  OCCASION TO CUT: the same paragraph doubled in length over four rounds of
  additions, because each one appended and none subtracted. Re-read the whole
  thing against the rule below, do not staple a clause on the end.
- 🔴 **ONE SENTENCE. A DESCRIPTION IS NOT AN ESSAY, AND IT IS NOT A PARAGRAPH
  EITHER.** Instructed 2026-09-19: *"descs are single sentences (do not stretch
  them with : ; -- etc)"*, and asked again in the same stream for page after
  page. **`descs` is the text under the title**: the `what` that
  `demo/shell/shell.mjs` appends as `<p class="pos-what">` directly under the
  `h1`, and the `one` line in `demo/manifest.mjs` that the index shows under a
  demo's name. They are the same string on any page with a diagram, by the rule
  below, so they move together.
  ⚠️ **AND THE SENTENCE MAY NOT BE STRETCHED.** No colon, no semicolon, no dash
  buying a second clause, no *"and"* bolted on to carry a second fact. A
  description that needs punctuation to fit is two descriptions, and the second
  one is the one nobody asked for.
  ⚠️ **THIS RULE SAID THREE SENTENCES UNTIL 2026-09-19, AND BEFORE THAT FOUR.**
  Each cut was asked for, each was broken within a few pages, and the reason is
  the same every time: a description is written while the page is fresh in the
  author's head, when everything about it feels worth saying. `grains` shipped
  FIVE long sentences that explained the granulator, defended why it has its own
  page, described the dice, and finished with what the board does unattended.
  Nobody read it, and the page it described was called *"mambo jumbo"* by the
  person it was written for. A visitor wants to know what this is. What to press
  is the control's own label, and what a number means is the readout key.
  **No history, no justification for a design decision, no account of what it
  used to be.** That belongs in a comment, in LESSONS.md, or in a commit
  message, all of which are read by somebody who asked.
- 🔴 **A COMPONENT SWAP MOVES EVERY SELECTOR THAT NAMED THE OLD ONE.**
  `/radio/`'s sound row went `createChoice` -> `createPicker` and one of the
  three rules keyed on the old class was updated. `shareLabelColumn()` went on
  setting `--lab` on exactly the right element and **nothing consumed it**, so
  the JavaScript and the comment beside it both read as correct while the row
  snapped back to the width of one word. REPORTED THREE TIMES, and the third
  report was a different bug wearing the first one's clothes. There is an assert
  on the left edges now and it fired at `12 px apart` before it passed.
  ⚠️ Its other half: a `12` typed in `shell.css` and a `0` typed in the page —
  **a shared measurement in two files is a measurement that will disagree**. It
  is `--sld-col` now.
- 🔴 **THE LOOPER IS A KIT MODULE, AND BOTH PAGES WITH A LOOP USE IT.**
  `demo/shell/looper.mjs`, 2026-09-16, asked for as *"make it use same looping
  ui as radio (make it global)"*. It owns what a loop IS: the ring that keeps
  the sound, the kept buffer, the mirrored copy, the one voice that reads a lap,
  where the sound has got to inside it, and the button glued to LOOP that
  cycles → ← ⇆. A page owns what else happens on its own graph, which node stops
  being heard, and what its log calls the thing it is looping.
  ⚠️ **THE TWO PAGES REACH IT AT DIFFERENT MOMENTS AND BOTH ARE RIGHT.** On a
  live station the sound has not arrived yet, so `keep()` is the bar's `fill`
  and `close()` is its `set`. On a tape both marks are behind you and the bar
  loops the file itself, so `keep()` is `set` and `close()` is the FIRST `wrap`:
  the first lap comes off the tape while the ring fills, and every lap after it
  comes off the ring. That is what makes a direction possible at all, because
  **no media element has a negative playback rate** and a kept lap is an
  `AudioBuffer` that can simply be mirrored.
  ⚠️ **ITS ARITHMETIC IS PURE AND IS GRADED WITHOUT A BROWSER.** `ringOrder`,
  `planVoice` and `headOf` are where every bug it has ever had lived (a ring
  copied from index 0 after it wrapped; a voice that always began at the top; a
  pingpong head that was a ramp and sat at the right edge for the whole return).
  `node demo/shell/looper-test.mjs` is 18 asserts, four of them negative
  controls, and three deliberate sabotages take 7 of them red.
- 🔴 **A DURATION IS A FACT ABOUT A FILE, MEASURED ONCE AND WRITTEN DOWN.**
  `corpus.json` carries `durationMs` on all 26 time-based rows since
  2026-09-16. `demo/resources/measure-durations.mjs` asks each file once with
  ffprobe, one at a time, two seconds apart, at `-probesize 65536` (a header,
  not half a recording), and writes `demo/resources/durations.json`;
  `build-corpus.mjs` merges it. `/tapes/` used to open twenty-four media
  elements on every visit and correct its picture over the following seconds,
  so every visitor paid archive.org for the same answers and saw a run of the
  wrong length first. ⚠️ **AMEND THE CORPUS WITH `--offline`**: it rebuilds from
  the cache, asks no source anything, and was MEASURED byte for byte identical
  to the committed file apart from its timestamp.
- 🔴 **A TABLE IS NAVIGABLE FROM THE KEYBOARD, AND AN ARROW MOVES RATHER THAN
  OPENS.** `table.mjs`, 2026-09-19, asked for as *"allow keyboard nav in
  tables"*: arrows, Page Up and Down, Home and End, Enter to open.
  🔴 **THE OBVIOUS SHAPE WOULD HAVE BEEN A DEFECT ON THE PAGE THAT ASKED FOR
  IT.** An arrow that moved the SELECTION, the way a file browser does, calls
  `onPick` per row, and `/making/`'s `onPick` fetches a picture off the bucket,
  so a held-down arrow pulls 63 files nobody asked to see. That is the
  load-on-a-visit defect, already paid for three times, arriving through the
  keyboard. Moving focus is free; opening is a decision and gets its own key.
  ⚠️ **AND A LIST IS ONE TAB STOP, NOT ONE PER ROW.** Every row was
  `tabIndex = 0`, so tabbing past a 63-row table took sixty-three presses. A
  roving tabindex fixes it, is invisible in a screenshot, and is free to read
  off the DOM, so assert it, including the negative half: one row at 0 AND
  every other at -1.

- **Two more kit components, both 2026-09-15.** `table.mjs` — rows in columns
  the caller declares (`key`, `label`, `width | grow`, `align`, `link`, `hi`,
  `clip`, `hover`); it THROWS unless exactly one column grows. `tabs.mjs` —
  uppercase, x-scrollable, no borders, `#links` rather than subpages (a subpage
  is a navigation: the audio stops, the service worker hands over, an installed
  web app flashes white). ⚠️ `tabs.mjs` is in `/kit/` and in NO page — it was on
  `/items/` for one commit and removed, because three names on a page holding
  one list and one form is furniture. 🔴 **`min-width: 0` or a scrolling row
  drags the PAGE sideways instead of scrolling**: `overflow-x` cannot shrink a
  flex item below its content, and 390 px measured 141 px of page overflow.
- 🔴 **BUILD FROM `/kit/`, AND SAY SO WHEN YOU CANNOT.** Before writing any new
  interface, look at what `demo/shell/` already has — slider, slider group,
  stepper, choice, keyboard, MIDI, transport bar, logger — and use it. Hand-
  rolling a control that exists is how three pages ended up with three different
  radio rows and two different slider stacks, and the cost is not only the
  duplication: `choice.mjs` and the slider group BOTH shipped emitting class
  names no stylesheet matched, which is a bug that only happens to a control
  nobody else uses. **If the thing you need is not in the kit, stop and ask** —
  whether to add it as a component, or to lift something a page already has and
  has not been componentised yet. Do not quietly build a fourth copy. A control
  that exists in one page and nowhere else is a component that has not been
  noticed yet, not a special case.
- 🔴 **THE RASPBERRY PI IS A KIT MODULE, AND BOTH PAGES THAT PLAY IT USE IT.**
  `demo/shell/board.mjs`, 2026-09-16, asked for as *"share code with knobs"*. It
  owns the socket, the reconnect, the presence, the 12-byte frame header, the
  conversion to float, the `pcm-playout` worklet, the cushion and its counters,
  and the check that a frame is the SHAPE the board publishes. A page owns which
  verbs it sends, what it does with a frame after the playout has it, and what
  its log calls things.
  ⚠️ **IT IS THE BETTER OF THE TWO HALVES, NEVER THE AVERAGE, AND THAT IS THE
  GENERAL RULE FOR THIS KIND OF MERGE.** `/keys/` hand-rolled its WebSocket and
  so could not tell a FULL ROOM from a DEAD RELAY (a browser cannot read the
  HTTP status of a refused upgrade; `openWire` asks `/stats` and says which),
  never checked a frame's shape, and never worked out which socket in the room
  WAS the board. All three came from `/knobs/`, so the page that had less gained
  three things rather than the two of them meeting in the middle.
  ⚠️ **THE CUSHIONS STAY DIFFERENT AND THAT IS NOT DRIFT.** 100 ms on `/keys/`,
  which reports press to sound and pays for every millisecond of it; 160 on
  `/knobs/`, which holds one note under a filter sweep where a click is the
  thing a listener cannot ignore. Two trades, one component.
- **Write for someone who does not work here.** Terse, but understandable —
  those are not in tension, and the old rule ("no explanatory prose, one line
  and a readout") produced pages that only their author could read. A demo page
  carries two things: **ONE paragraph of three or four sentences** saying what
  happens, how it is done and what the numbers mean — and a readout of real
  numbers. It was a lead line plus a second `d.how()` paragraph until
  2026-09-08; two blocks meant the lead said too little and the mechanism went
  unread. `d.how()` is gone; put it all in `what`.
- **No jargon in anything a visitor sees.** Not in `what`, not in `how`, not in
  a readout key, not in `manifest.mjs`'s `one` line. Banned unless the page
  defines it on the spot: lookahead, horizon, one-shot, tick, host, commit,
  actuate, lattice, deck, lane, fold, adapter, evidence gate. Say what it does,
  not what it is called internally. `drift` survives only because it is a
  readout key with a sentence under it explaining it is lateness in
  milliseconds, and that it is NOT stream latency — a reader assumed exactly
  that, which is what prompted this rule.
  ⚠️ **A THING'S NAME IS NOT JARGON — DECIDED 2026-09-13, do not re-litigate.**
  `Yoshimi`, `Pappus`, `Ableton Live`, `SuperCollider` are what those programs
  are CALLED, and the open question of renaming them to something friendlier is
  answered: leave them. A friendly label invented here would be a name nobody
  can search for, and it would hide which program is making the sound, which is
  the one fact those pages exist to report. The rule is about words that
  describe a MECHANISM in this project's private vocabulary (a fold, a lane, an
  evidence gate), not about proper nouns.
  ⚠️ **THE ROW THIS WAS DECIDED ABOUT NO LONGER EXISTS**, and the decision is
  kept because it is about names rather than about that control. `/keys/` had an
  instrument row offering `sampled`, `hexter` and `yoshimi`; two of the three
  left the board on 2026-09-16 and a choice of one is not a choice. See
  `archive/box-fluidsynth-hexter/`.
- **A constant belongs beside the thing it governs, not in a header.** `how()`
  took a spec line of real values (`looks 100 ms ahead · re-checks every 25 ms`)
  on the theory that constants beat prose. They do — when someone is looking for
  them. Above a paragraph they are one more thing to parse before reaching the
  sentence that says what is going on. The numbers now sit under the lane whose
  behaviour they describe, in the strip's gutter. Wherever a number IS printed,
  read it from the same constant the page hands the library, never typed twice:
  a description that can disagree with the config is worse than none.
- **Per-lane numbers go in that lane's gutter** (`subLabel`), never in a
  separate table or a readout row. Joining a figure to its ink across two
  elements is what makes a legend necessary; put them together and it is not.
- **A gutter carries what its lane MEASURED, never instructions.** `typical
  +1.20 ms` / `worst +2.90 ms`, or an honest `no way to check` — not "press
  Record", not "drag the line". Help text belongs in the one `how()` paragraph,
  and if a reader still cannot tell what to press, fix the control's LABEL.
  Instructions in a gutter crowd out the numbers, repeat the paragraph above,
  and do not fit. **Anything that truncates with an ellipsis is in the wrong
  place** — that is the signal, not a styling problem to widen your way out of.
- **A tooltip is two or three short lines, never a sentence.** It is drawn ON
  TOP of the thing it describes and is read every time you point at one, so a
  paragraph there covers the picture and gets re-read twenty times. Budget
  ~40 characters a line: what it is, the number, the mechanism. Explanation
  goes in the `how` block, which is read once. `1.20 ms late · as expected` /
  `timer set ahead`, not `A timer was set for it in advance. Those land
  within a few ms.`
- **Every readout cell must be able to change.** A cell showing a structural
  constant reads as a measurement and teaches the reader to ignore the row.
  01's `missed` count was always 1 — the mark due at position 0 can never have
  a timer — so it became `worst`, which moves. Prefer median AND max over
  either alone: a median hides the one bad fire that is the reason to look.
- **A colour scale whose normal reading is a warning has no warning left.**
  Calibrate against what the mechanism promises, not against an absolute
  ideal. 01 first painted 18 of 20 marks amber on a loaded machine, against a
  5 ms threshold — while the lab measures the shipped worker host at p50
  5.0 ms, so the DOCUMENTED BASELINE was amber. Colour and words must come
  from one table, so a green bar can never be described in language that
  sounds like a failure.
- 🔴 **NOTHING THAT REDRAWS EVERY FRAME MAY CHANGE HOW MUCH ROOM IT TAKES.**
  A live picture is fine. A live SENTENCE under it is not: `grain-scope` carried
  a caption that rewrote itself sixty times a second and reflowed between three
  and four lines, so the picture, the pane and everything below them jumped
  continuously — reported as *"a horrible jump of content each time it
  updates"*. The words were accurate and it did not matter. ⚠️ The fix is never
  to shorten the sentence: any prose that updates live will eventually straddle
  a line break, and then it is back. **A changing number goes in a READOUT
  CELL**, which is a fixed box with a reserved width (`tabular-nums`, and the
  slider reserves its widest value for the same reason) — or in a lane's
  gutter, which is also fixed. Text that updates at human pace — a log line, a
  verdict after a check — is fine, because it moves when something happened
  rather than on a clock. The test is not "is it short", it is **can this change
  its own height while somebody is looking at it**.
- 🔴 **A PAGE DOES NOT NARRATE ITS OWN STATE IN SENTENCES.** `grains` generated
  two paragraphs a frame — *"both are chewing the same saw — 72 sine partials
  over 6 notes, made separately at each end from one description"* and *"moving
  on its own · 53 nudges in the 8 s this page has been watching, none of them
  asked for · the slow one is reading at 0.416 of the way through the sixty
  seconds"*. Every number in them was real. The reader's word for it was **slop
  prose**, and the failure is the FORM, not the wording: a sentence has to
  re-say the unchanging part beside the one figure that moved, so you re-read a
  paragraph to find a digit — and it rewraps while you do. A figure goes in a
  **readout cell** or a **lane gutter**, both fixed boxes. A claim goes in an
  **assert**. A state change goes in the **log**, when it changes. ⚠️ And when
  you delete such a block, REHOME WHAT IT SAID — deleting the display without
  the facts is how a page quietly stops reporting something, which is worse
  than saying it badly.
- 🔴 **SEPARATION IS SPACING, NOT LINES — AND AN EMPTY BOX IS A LINE.**
  `shell.css` sets one vertical rhythm on the gap between siblings, so a divider
  is a second channel saying what the spacing already says; `.pos-head` carries
  a note saying exactly that and has no rule under it. ⚠️ **The failure is not
  only an explicit divider.** MEASURED on `/typist/`: a page declaring
  `readout: null` still got a `.pos-readout` div with no children, and its own
  1 px border top and bottom rendered as a **2 px full-width band 24 px above
  the controls** — a horizontal rule nobody wrote, reported as "old UI creeping
  in", which it was, just not in the way it looked. **A page that opts out of a
  surface must opt out of its BOX too**, and that cannot be the page's job to
  remember — the shell hides an empty readout now, the same way
  `.pos-controls[hidden]` already handles an empty control row that was leaving
  a 14 px band behind. A container with nothing in it must not paint its edges.
- 🔴 **VERTICAL SPACING IS A RULE, NOT A PER-PAGE DECISION.** Elements on a demo
  page do not sit tight against each other. `shell.css` sets ONE rhythm —
  `.pos-body > * + * { margin-top: 22px }` — on the GAP BETWEEN siblings rather
  than on each element's own margin, so a lone element carries no gap to
  nothing and two adjacent ones cannot disagree about how much air is between
  them. A page that needs a different gap somewhere is a page making a claim
  about that one relationship, and it says so in a comment. ⚠️ The failure this
  fixes is not ugliness: a pad, a strip, a transport bar, a knob row and a log
  with nothing between them read as ONE dense block, and a reader cannot tell
  which control belongs to which picture.
- 🔴 **follow TRACKS THE NEWEST FACT ON THE STRIP, WHICH IS NOT ALWAYS THE
  PLAYHEAD.** Every page before `/stage/` followed the playhead because there
  was nothing else it could be, and the rule was written into `followTick` as
  `S.pos`. A tab watching a show being RECORDED has a newest fact and no
  playhead: nothing is playing, the deck sits at 0, and the strip stood still
  while its own rows arrived. `followTarget` (option, or `setFollowTarget(fn)`)
  names it; `armWall(0)` at the recorder's start makes `wallPos()` the write
  head, and `() => wallPos()` is both cases written once, because `disarmWall()`
  hands back to the playhead by itself.
  ⚠️ **AND AN ARMED WALL MEANS THE PICTURE MOVES.** The strip repainted on
  `wallAnchor && deck.playing()`, so a real-time cursor was frozen whenever no
  deck was running and the whole feature was inert with every line of it
  correct. It repaints on `S.wallAnchor` alone now, and a page whose wall has
  stopped meaning anything puts it away rather than keeping a stale one.
  ⚠️ **A WINDOW IS A CEILING, NOT A WIDTH.** At 1280 px a three hour recording
  is 8.3 s per pixel, so the view in which the whole show fits is the view in
  which nothing in it reads. Open on `min(length, window)`, so a short piece
  still fits whole.
  ⚠️ **AND `followsPlayhead` REPORTS THE SETTING, NOT THE BEHAVIOUR.** A check
  built on it, on a finite `followPos` and on a window that MOVED read 32/32
  against a `followPos` sabotaged to ignore the target entirely: the harness had
  seeked the playhead to 90 s, so the number was large and real, and a window
  chasing it moved 17,119 px. Compare `followPos` against the WRITE HEAD and
  require the write head to be on screen.
- **One position surface per page.** A page with a strip passes
  `createTransportBar(…, { scrub: false })`: two horizontal time axes at
  different scales, stacked, is not a redundancy but a contradiction. The
  strip already seeks on press AND on drag, which the bar's slider did not.
  🔴 **AND A BAR MAY HAVE NO PLAY BUTTON AT ALL: `toggle: false`, 2026-09-16.**
  Play, pause and seek are all claims about a POSITION inside a sound, and
  `/keys/` has none: a note sounds while a key is held, there is nothing to
  start or resume, and a toggle whose only honest behaviour is to do nothing is
  the shape of control this project calls a lie. What such a bar still carries
  is the `chip`. On both board pages that is the presence badge, because the
  fact worth having about an instrument in another building is whether it is
  answering. ⚠️ **IT DISARMS EVERYTHING THAT DEPENDED ON PLAYING** rather than
  leaving it to read false by luck: `api.playing` is forced false, the space bar
  stops being a play key, the end-stop never arms, and `api.toggles` says so in
  one boolean. **`demo/verify.mjs` reads `api.toggles` before its play drill**,
  which clicks `.tbar-toggle` and asserts the position advanced; without that a
  bar with no toggle takes the harness red on a page where nothing is wrong.
