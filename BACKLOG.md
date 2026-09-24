## Open

### Open 2026-09-24: the repo goes public, and a README somebody can paste

🔴 **ASKED, VERBATIM, ACROSS FIVE MESSAGES:** *"make repo public. add to
readme a prompt how one can replicate similar setup with cf
https://developers.cloudflare.com/agent-setup/prompt.md etc. they should be able
to just paste repo url. a (meta?) skill next to it?"*, *"example: i want build
something like that stage demo"*, *"add gates: cf account? wranger? node? detect
envitonment. osx mostly. cf auth / tokens? paid nonpaid?"*, *"nondeveloper might
use it"*, *"explain why havin domain is prefeered"*, *"do it now"*

1. **A `README.md`, which this repo has never had.** `ls README*` finds nothing
   at the root. It is the file a stranger opens first and the only one written
   for somebody who does not work here.
2. **A prompt in it that a person can paste**, with nothing but this repo's URL,
   into Claude Code or another agent, and get a positron-shaped site of their
   own on Cloudflare. It hands off to Cloudflare's own
   `https://developers.cloudflare.com/agent-setup/prompt.md`, which is a system
   prompt that tells an agent to install the Cloudflare plugin and MCP servers
   ITSELF rather than asking the reader to run anything.
3. **A skill beside it**, so the instructions travel with the checkout:
   `.claude/skills/` is picked up by Claude Code in any clone.
4. **Gates, checked before anything is created**: an operating system (macOS
   mostly), node, wrangler, a Cloudflare account, whether that account is
   authenticated, and **whether it is a paid plan**, because some of what this
   repo uses is not on the free one.
5. **Written for a non-developer.** That is the constraint that decides the
   whole shape: every gate says what to do when the answer is no, and nothing
   assumes a terminal habit.
6. **Why a custom domain is preferred**, explained rather than asserted.

🔴 **AND THE AUDIT FOUND ONE THING THAT MUST NOT BE PUBLISHED, SO THE REPO IS
NOT FLIPPED IN THE SAME BREATH AS THE REST.** `New Pack.circuitpack` is
**reachable in history at `419ec5c`, 3,506,555 bytes**, verified with
`git cat-file -s`. CLAUDE.md says what it is in red: a complete backup of the
Novation Circuit on this desk, **29 sessions of somebody's real work**, their
ONLY copy since `tmp/` stopped being tracked, and the owner's words about it are
*"user sessions are mine. very important"*. A public repository hands that file
to anyone who clones it, and a clone cannot be recalled.
⚠️ **AND THE SAME BLOB IS CURRENTLY A BACKUP**, which is the bind. CLAUDE.md
names `git show 419ec5c:'New Pack.circuitpack'` as the recovery path, so a
history rewrite that drops it destroys the second copy at the same moment it
protects it. **The order is: copy the blob out to disk, verify 3,506,555 bytes,
THEN rewrite.**
🔴 **AND A SECOND ONE THE AUDIT FOUND THAT NOBODY WAS LOOKING FOR: TWO CHROME
USER PROFILES ARE IN HISTORY.** **857 files** under
`rig/moq/spike/logs/moq-4k-probe-udd/` and `.../moq-safari-pub-udd/`, added by
three commits (`469d237`, `880ceb8`, `d3f0cd0`), including `Default/Cookies`,
`Default/Login Data`, `Default/History`, `Default/Web Data`, `Default/Trust
Tokens` and `Local State`. **None of them is at HEAD** (`*-udd/` is gitignored
now), so this is history only, and history is what a clone gets. They are also
most of the repository's **191 MB**.
⚠️ Smaller findings, none of them a stop: `rig/moq/mtx/moq-key.pem` is a
committed PRIVATE KEY (a self-signed local cert for `moq-mtx-local`, so the
exposure is nil, but a scanner will flag it and it should not be in a public
tree); `SECRETS-ROTATION.md` publishes a map of past exposures including one it
says is **still unrotated** (`positron-demo`'s RTMPS key) and one in another
repo it calls *"still public"*; there is **no LICENSE file**, so publishing
leaves everything all rights reserved by default; and the commits carry a WORK
email address on a personal repository.

✅ **EVERYTHING EXCEPT THE FLIP IS DONE 2026-09-24.**
- **`README.md`**, 142 lines, the first one this repo has had. It carries the
  paste block, the gate table in plain words, what is free and what is not with
  the numbers, why a domain is preferred in four reasons, and a map of the
  directories.
- **`.claude/skills/positron-start/SKILL.md`**, 240 lines, six gates and a
  worked decomposition of `/stage/` into the parts that are free and the one
  part that is not. Claude Code registered it on write, which is the proof it is
  discoverable in a clone.
- 🔴 **IT WORKS FOR CODEX TOO BECAUSE THE PASTE BLOCK NAMES THE PATH.** Asked
  as *"should work in claude and codex"*. Claude Code discovers
  `.claude/skills/` by itself; every other agent is told to read
  `positron/.claude/skills/positron-start/SKILL.md`. **One file, two doors**, so
  the two cannot drift apart, and the skill carries a line forbidding anything
  in it that depends on one agent's features.
- **The plan facts were re-read rather than remembered**, off Cloudflare's own
  pricing pages on 2026-09-24: Durable Objects ARE on the free plan (SQLite
  backend only), R2 free tier is 10 GB with free egress, **Stream has no free
  tier** ($5/1,000 minutes stored prepaid, $1/1,000 delivered) and
  **Containers are Workers Paid only**. So the honest answer to *"do I have to
  pay"* is no for most of the site and yes for live video.

### Done 2026-09-24: the title counts itself, and `instruments` changes hands

🔴 **ASKED, VERBATIM, TWO MESSAGES:** *"convert title to // positron: x media
art experiments // where x is num of demos in frontpage. html <title> stays
positron. deploy"*, then *"rename hardware to instruments, move knobs able
grains there. looper instrument  jam moves to ithers (timeline or messfgs or )"*

1. **The front page's `h1` carries the count.** `indexTitle()` in
   `demo/manifest.mjs`, counted off `byGroup()` rather than `DEMOS.length`,
   because the question is how many rows the PAGE shows: 58 against 59 in the
   array, `feedback` being `unlisted`. Baked by `workers/view/build.mjs` into a
   `<!--TITLE-->` marker in `menu.html` and set at load by `demo/index.html`,
   which is the same one-renderer-two-callers arrangement the rows already use.
2. **The tab stays `positron`.** Both index pages carried
   `<title>positron: media art experiments</title>`, so this is a change and not
   a no-op, and it is what the instruction says in words.
3. **`hardware` becomes `instruments`** and takes `knobs`, `able` and `grains`.
   ⚠️ That reverses the last line of the comment that created `hardware` on
   2026-09-21, which named those three as arguable and said they *"stay where
   they are rather than being swept in on an inference"*. This is not an
   inference, so the comment records the instruction instead.
4. **`looper`, `instrument` and `jam` leave**, which empties the old
   `instruments` group and frees the name for 3.

✅ **ALL FOUR DONE AND DEPLOYED 2026-09-24**, BUILD `e0158ba-130642-c980`,
version `069d9872-2d9c-422e-ac55-4f4cad16feff`. Read back off the live page
rather than off the build: `<title>positron</title>`, the `h1` reads
`positron: 58 media art experiments`, **58 cards**, **11 sections**
(`TH` `err` `instruments` `u:` `kurenniemi` `capture` `timeline` `streaming`
`messages` `technologies` `kit`).

✅ **MEASURED AT THREE WIDTHS BEFORE DEPLOYING**, because a longer name sits in
a flex row beside the Feedback button: 390 px wraps the name to TWO lines (h1
270 px, the button at x=296) and 756 and 1280 keep it on one. **Page overflow
0 px at all three**, which is the number that would have said this was a fault.

✅ **WHERE THE THREE WENT, AND ONE OF THEM IS ARGUABLE.** `jam` and `instrument`
to `messages`, `looper` to `technologies`. ⚠️ `instrument` breaks the wording
this file shipped an hour earlier, *"a relay carrying messages with no media in
it at all"*: the far machine's audio comes back over the same connection. It is
in `messages` because its readout is two LATENCIES and the audio is what makes a
late message audible, and `manifest.mjs` names it as the arguable row rather
than hiding it.

✅ **AND `stage` JOINED `TH` 2026-09-24** on *"move stage to th"*, out of
`capture`: it puts a church scene from a 2011 MIMproject performance in front of
an audience, so it sits beside `making`, that project's archive. 🔴 **THE GROUP
ID WENT `xr` -> `th` WITH IT**, because three of its six rows now have nothing to
do with a headset and the key was about to teach the next reader something
false. ⚠️ The `xr: true` FLAG on a row is a different thing and did not move:
`caps.mjs` reads it to offer a headset page, and `mirror`, `weight` and `floor`
still carry it, `floor` from another section entirely. Built at
`e0158ba-132955-eba3`, NOT deployed.

✅ **`workers/view/verify.mjs`'s TITLE ASSERT WAS ALREADY RED AND NOW IS NOT.**
It expected `POSITRON` while the tab read `positron: media art experiments`.
⚠️ **THAT FILE HAS OTHER STALE ASSERTS AND THEY WERE LEFT ALONE**: it counts
`li.pos-row` against `DEMOS.length + NOTES.length`, and the front page has drawn
`.pos-card` for weeks. It needs a real look rather than a line.

### Done 2026-09-24: the front page regrouped, and three demos retired

🔴 **ASKED, VERBATIM, IN ONE MESSAGE:** *"arvhice memento blocks and num demo.
move headset group first in index. rename to "TH". second group err, move floor
to err and the one what had err audio and video side by side. move making to TH.
rename vain to u:, move clic and vclick there. rname cvlick demo do ound. move
typist to th. timeline: leave ones who have timeline component. the rest merge
with technologies and split onto streamig (who steam smth) and messages (relyng
messages etc but not streaming) and rest is techologeis. show dev link asap"*

Every line below is one line of that, and almost all of it lands in ONE file,
`demo/manifest.mjs`: the `DEMOS` rows' `group`, and the `GROUPS` map that
decides both the order of the sections and what they are called. Two index
renderers read it (`demo/index.html` and `workers/view/build.mjs`), so there is
nothing to change in either.

1. **Archive `memento`, `blocks` and `num`.** `archive/demos/README.md` has the
   procedure: `git mv demo/<slug>/index.html archive/demos/<slug>-index.html`,
   drop the row from `demo/manifest.mjs`, write the section saying what it was.
   Each of the three is a single `index.html` with no other file beside it.
   ⚠️ All three are quoted by live code as the page that proved something:
   `/blocks/` by `xr-quit.mjs`, `xr-panel.mjs`, `xr-hands.mjs`, `seed.mjs`,
   `weight` and `tom`; `/num/` by `keyboard.mjs`, `numloop.mjs` and `nola`;
   `/memento/` by `cc-adapter.mjs` and `timeline/media-master.mjs`. Those are
   HISTORY and stay, but a live `href` to any of the three would now 404 the way
   `/kit/`'s card did after the `held` rename.
2. **Headset group first, renamed `TH`.** `GROUPS` order, `['xr', 'headset']`.
3. **A second group, `err`**, holding `floor` and `reel`.
   🔴 **THE FIRST ANSWER WAS `flipper` AND IT WAS WRONG.** `flipper` is the
   only page in the repository that holds ERR television and ERR radio at once,
   so a grep for `icecast.err.ee` beside a `<video>` finds exactly it and nothing
   else, and that is what I reported. Corrected in one line: *"it was not
   flipper"*, then *"what is demo where we had err video + radio (synced on not)
   and timeline?"*. It is `reel`, and the page says so at the top of its own
   stylesheet: *"ONE COLUMN PER MEDIUM: the newsreel on the left, the radio on
   the right"*, two lanes on one line, a day usually bringing a newsreel AND a
   radio programme. ⚠️ The lesson is that the search was for the SOURCE
   (a live ERR mount) when the ask was about the LAYOUT (two media side by side),
   and `reel` plays the archive rather than the live mounts, so it could not
   match. `flipper` stays where it is, `now` was not named either.
   🔴 **AND THIS REVERSES A 2026-09-16 INSTRUCTION THAT IS WRITTEN INTO
   `manifest.mjs` IN RED**: *"hide the ERR archive from frontpage"* and *"no err
   refs"*, said the evening ERR reported our connections corrupting their
   listener statistics. The pages never moved; the SECTION NAME did. Putting the
   name back is the thing that was deliberately removed, so the comment block
   above `GROUPS` has to record the reversal rather than be deleted.
4. **`making` to `TH`**, which empties the `mim` group.
5. **`vain` renamed `u:`**, with `click` and `vclick` moved into it.
6. **`vclick` renamed.** Slug rename, so directory + URL + every reference, the
   `radio1965` -> `radio` shape. The target name was not legible in the message.
7. **`typist` to `TH`.**
8. **`timeline` keeps the rows that have a timeline component; the rest merge
   into `technologies`, which then splits three ways**: `streaming` (streams
   something), `messages` (relays messages but does not stream), `technologies`
   (the rest).
   ⚠️ MEASURED before assuming: ALL NINE rows now in `timeline` call
   `createStripView` from `demo/shell/strip.mjs`, and after `click`, `vclick`
   and `typist` leave, the six that remain (`transport`, `lanes`, `loops`,
   `score`, `strip`, `draw`) all still do. So on the component test nothing
   merges, and the split of `transports` is the only part that moves.
9. **Dev link first.**

✅ **ALL NINE DONE 2026-09-24.** The front page is **12 sections over 58 listed
rows** (59 in `DEMOS`, `feedback` is `unlisted`), in the asked order:
`TH` `err` `hardware` `u:` `kurenniemi` `instruments` `capture` `timeline`
`streaming` `messages` `technologies` `kit`.

✅ **THE TWO AMBIGUOUS ASKS WERE ASKED ABOUT RATHER THAN GUESSED.** *"do ound"*
is `sound`, and the timeline split is the four pages whose SUBJECT is the
timeline. The measurement is why the second one had to be asked: the component
test separated nothing, because all nine rows mounted a strip.

✅ **`vclick` -> `sound`**, directory and URL and identity strings, plus
`manifest.mjs`, `shell/stack.mjs`, `shell.css`, `timeline/strip.mjs`,
`timeline/csound.mjs`, `timeline/lab/csound-test.mjs`, `workers/view/build.mjs`,
five plans, one research note and `positron-verify`. **`tarmoj/vclick` did NOT
move**: it is U:'s own repository, named in four files, and renaming it would
have pointed all four at nothing. MEASURED after: `node demo/verify.mjs sound`
is **23/23 with 11 page asserts**.

✅ **THREE PAGES ARCHIVED** to `archive/demos/<slug>-index.html` with a section
each in that README, and two claims they were carrying were repaired rather than
left to rot: `demo/weight/index.html` said `/blocks/` already graded the quit
badge the same way on load (it was weight's second opinion and is now its only
one), and `demo/tom/index.html` named `/blocks/` as the other `readout: null`
page, where twenty pages do that. `demo/verify-quest.mjs`'s usage example named
the slug too.

✅ **`CLAUDE.md` RECOUNTED** rather than remembered: **59 rows, 57 shelled**, and
`positron-history` had drifted to `54 of 56` and carries the rename now.

⚠️ **WHAT WAS NOT DONE, AND IT IS NOT FORGOTTEN:** nothing is deployed. The
build ran (`stamp e0158ba-120343-75bb`) so `workers/view/public/` matches, and
`positron.studio` still serves the old front page until somebody deploys.

### Open 2026-09-24: `/fau/`'s second round, and four wrong answers before the right one

🔴 **ASKED, VERBATIM, ACROSS SIX MESSAGES:** *"double border, rm"* with a crop,
*"add padding under nameplate"*, *"you ui skills are pathetic"*, *"its just
nonrounded bonbordered texateea between 2 glues"*, *"fau on off is missing
border"*, *"still double bottom border on fau textarea"*, *"add more left padding
to textarea in fau"*, *"can you have comments in fau file what lines do?"*

✅ **ALL DONE 2026-09-24. The record of the wrong answers is the useful half.**

🔴 **THE DOUBLE BORDER WAS NOT A BORDER AND IT TOOK THREE GUESSES.** Every
element in that subtree measured `0/0/0/0` or a control's own legitimate box, so
reading the CSS found nothing and I twice fixed something that was not broken:
first I removed the presence button's border, which is a real affordance and
came straight back as *"fau on off is missing border"*.
✅ **THE RECTS SAID IT IN ONE LINE ONCE I ASKED THE RIGHT PAIR.** The field
wrapper's bottom was **557.5** and the textarea's was **556.0**. A textarea is
`inline-block` and sits on a TEXT BASELINE, so its block parent reserves
descender space under it. That 1.5 px strip belongs to the wrapper, the wrapper
is transparent, and **a glue paints `--line` behind its children as the seam**,
so the page drew 1.5 px of seam colour, then the real 1 px seam. `display: block`
on the textarea. MEASURED after: both bottoms **563.0**.
⚠️ **AND THIS IS WHY IT SHOWED UP HERE AND NOWHERE ELSE.** Anywhere but a glue
the ground behind a child is the page's own background and invisible. Inside a
glue the ground is deliberately a line colour, so **every stray pixel of layout
becomes a visible line**.

✅ **THE NAMEPLATE, AND IT IS THE THIRD TIME THIS COMPONENT HAS BEEN REPORTED FOR
IT.** `shell.css` gives the plate `padding-block: var(--panel-pad) 0`, zero at
the bottom, which is correct while something FOLLOWS it because `.panel-strip`
brings its own. Emptying the strip exposed the zero: MEASURED `gap under plate
0.0px`. `/tom/` fixed the TOP half of this privately once, every later page
inherited the defect and not the fix, and it was re-reported on `/plai/` as
*"you failed afain on nameplate padding"*.
🔴 **SO BOTH FIXES WENT IN THE COMPONENT, NOT THE PAGE**, and the page-local
`:empty` rule written an hour earlier was deleted. `:has(> .panel-strip:empty)`
makes it provably narrow: MEASURED, the three pages that build an instrument add
**62** (`/kit/`), **5** (`/fau/`) and **4** (`/muta/`) blocks, so exactly one case
in the repository is empty and exactly one page changes. `/muta/` re-run to prove
it: **51/51 with 45 page asserts, unchanged**.

✅ **LEFT PADDING 16 px, TOP 14**, on `.pos-field.fau-src textarea`, which is a
`(0,2,1)` TIE with `shell.css`'s `.pos-field.tall textarea` and not an
escalation. The first attempt at `(0,1,1)` lost to that rule's `padding: 7px 9px`
shorthand and the computed value read 7 px while the source read as correct.

✅ **THE PATCHES CARRY COMMENTS NOW**, one per line that does something a reader
cannot guess: what `<:` splits, what `_` is, that `en.adsr`'s third number is a
level and not a time, that FM is the carrier being BENT rather than added to, and
that `3.51` is the whole bell.
⚠️ **AND THE BOX WAS RESIZED TO WHAT IT NOW HOLDS.** At `rows: 12` the longest
preset was cut through the middle of `process`, which is the one line a reader
most needs. MEASURED: the four presets are **14, 16, 6 and 13** lines with their
comments, so `rows: 16` is the longest of them rather than a number that looked
about right.

MEASURED throughout: `/fau/` **45/45 with 39 page asserts**, unchanged across
every state of this.

### Open 2026-09-24: `/fau/`'s panel, four asks and one of them is a repeat

🔴 **ASKED, VERBATIM:** *"fau: as i told you: input edge to edge of container w,
add paddign on top, add line in top. glued instrument feel like waveforms on
muta"*.

⚠️ **AND *"AS I TOLD YOU"* IS THE PART TO READ FIRST.** Edge to edge was already
asked on 2026-09-23, quoted in the page's own comment as *"create instument
panel, fau on top right, below the textarea (edge to edge), below it footer with
on/off"*. It was built and it is not edge to edge, so this is the second time of
asking and the first answer was wrong.

✅ **ALL FOUR DONE 2026-09-24, AND THEY WERE ONE CHANGE RATHER THAN FOUR.**
The last clause is the answer to the other three: `/muta/` passes its wave shape
as **`parts: [scope.el]`** and this page was calling **`inst.add(source.el)`**.
`instrument.mjs` already spells out the difference in its own words: `add()` puts
something INSIDE the case, where it scrolls with the panel and sits within the
case's inset, and a part is its own surface with the glue's seam either side of
it, *"the same edge the bar has, at the same width"*. So moving one line gave
edge to edge and the top line at once, and only the top padding was a rule.

🔴 **WHY `edge to edge` HAD TO BE ASKED TWICE: THERE WERE FOUR BOXES INSETTING
IT AND THE PAGE'S COMMENT COUNTED THREE.** The 2026-09-23 answer zeroed
`.panel-strip`'s padding on both axes and named the strip's gap, the strip's pad
and the field's label. The fourth is **`.panel-case` itself**, `padding: 0
var(--panel-pad)` with `--panel-pad: 20px`, on the case. **A child cannot reach
its way out of its parent's padding however many of its own rules say 0**, so the
text was 20 px short at both ends while every rule about it read as correct.
⚠️ AND THE REPAIR IS NOT A FIFTH OVERRIDE. It is a different slot: as a glue part
the text is a sibling of the case rather than a child, so there is no padding
left to fight.

✅ **MEASURED, NOT EYEBALLED.** Case, text and footer bar all span **107 to 793**
inside a glue of 106 to 794, which is the glue's own 1 px border. The field
carries `padding-top: 10px` and the glue's 1 px seam is the line above it.

🔴 **AND THE MOVE EXPOSED AN EMPTY BOX, WHICH IS WHY THIS IS FIVE THINGS AND NOT
FOUR.** With the text gone the case was a **71 px band holding one word**, with
an empty **40 px strip** inside it whose whole height was `padding-block:
var(--panel-pad)`. `.fau-panel .panel-strip:empty` collapses it and the case is
**31 px** now. The plate was measured rather than hoped for: it sits in the
case's top inset at 748.5 px and `FAU` is still top right, where the 2026-09-23
ask put it.
⚠️ **PAGE SCOPED ON PURPOSE.** Any case with a plate and no controls has this, so
it looks like a `shell.css` fix, and making it one would change every instrument
page from inside a task about one.
⚠️ **AND EVERY RULE ABOUT THE FIELD WAS RE-KEYED OFF ITS OWN CLASS**, `.fau-src`,
because they all named `.fau-panel` as an ancestor it no longer has. That is the
dead selector this stylesheet has now measured five times.

🔴 **AND IT SHIPPED WRONG ONCE, REPORTED AS *"its a mess"* WITH A CROP.** The top
padding was put on the PART, which also carried `background: var(--card)`, so the
page drew **case, seam, a second band of the same dark, then the well**: two
bands of one colour with a line between them, which is furniture rather than air
above the text. **Air inside a box belongs to the box.** The padding is the
textarea's own now and the part carries no background, so the input is one
unbroken surface from the seam down.
🔴 **AND THE CORRECTED RULE LOST ITS FIRST FIGHT, MEASURED RATHER THAN
REVIEWED.** `.fau-src textarea` is `(0,1,1)` against `shell.css`'s
`.pos-field.tall textarea` at `(0,2,1)` setting `padding: 7px 9px` as a
SHORTHAND. Weight decides before order does, so the computed value read **7 px**
while the source read as correct. The border on the same element DID win, because
the rule it beats is `(0,1,1)` and a tie goes to the later sheet.
✅ **`.pos-field.fau-src textarea` IS A TIE AND NOT AN ESCALATION**, which is the
smallest thing that can win. MEASURED after: `padding-top: 14px`.

MEASURED: **45/45 with 39 page asserts, identical across all three states of this
change**, so nothing went silent.

### Open 2026-09-24: the remote looper, and the distributed instrument behind it

🔴 **ASKED, VERBATIM:** *"in bg, plan the "remote looper" feature. I am in
desktop browser, midi keyb connected but i want mobile browser on same webpage
have 3x3 grid buttons to toggle the looper"*, and a message later *"think wider
of distributed instument (parts) like this"*.

**The shape.** The desktop browser holds the MIDI keyboard and the sound. The
phone, on the SAME page, shows a 3x3 grid that toggles the looper's slots. So
one instrument, two devices, and the phone is a control surface carrying no
audio.

**What already exists and is not to be rebuilt.**
- `demo/shell/numloop.mjs` is the state machine, 15 checks in `numloop-test.mjs`,
  no browser needed.
- `createKeyboard` in `demo/shell/keyboard.mjs` holds the ten takes and puts
  `Loop` left of `Sustain`. Playback calls `press(k, 'loop')`, so a looped note
  reaches a page's `onDown` exactly as a finger does.
- `/num/` is the bench with the telephone keypad, MIDI in and program change
  mapping. Ten slots exist; a 3x3 grid is nine of them, and which nine is a
  decision the plan has to make rather than assume.
- `workers/items` already gives every room its own Durable Object by
  `idFromName(room)`.

**What is open in it.** Whether the phone drives the desktop's `numloop` over a
relay or runs its own copy, what happens when the two disagree, what a press
costs in latency against a lap of 250 ms minimum, and whether the page is one
URL that decides its role or two.

⚠️ **AND THE SECOND ASK IS THE LARGER ONE.** *"think wider of distributed
instrument (parts)"* is not this one feature, it is the pattern: an instrument
split across devices, each part carrying what that device is good at. The plan
covers the pattern and this feature is its first instance.

✅ **PLANNED 2026-09-24, `plans/plan-remote-looper.md`, 1,055 lines. THE PLAN IS
DONE AND THE FEATURE IS NOT, SO THIS STAYS OPEN.** The recommendation, so the
decision is in this file and not only in that one: **one URL with
`?role=controls`**, following `/moq/`'s existing `?role=` rather than inventing a
spelling; **the phone sends a PRESS and never a state** and holds no copy of the
machine; the desktop **broadcasts all ten states on every change and every 2 s**;
the grid is **3x3 of slots 1 to 9 with slot 10 in a fourth row**, which is
`/num/`'s existing `createPadGrid` call with two disabled blanks; and the new
code is **one kit module, `demo/shell/part.mjs`**, which owns the seam and knows
nothing about loops.
🔴 **THE RULE THE WIDER ASK PRODUCED: NEVER SPLIT THE CLOCK.** The part that
makes the sound owns time and everything else sends gestures and receives
pictures. A seam is cheap in proportion to how much lateness it can absorb, and
a clock can absorb none because lateness IS the product.
⚠️ **AND THE NUMBER NOBODY HAS: no measurement in this repository describes a
phone's leg to the relay.** Every figure quoted is a laptop on this desk, and the
two recorded relay runs disagree six-fold on the hop. Section 3 of the plan is
inference until a phone posts its own round trip to the device log.

### Open, carried in from HANDOFF.md on 2026-09-24

🔴 **THESE SIX LIVED IN `HANDOFF.md` UNDER `Still open` AND NOT IN THIS FILE,
WHICH IS THE WRONG FILE BY THIS PROJECT'S OWN RULE.** `## Open` here held
nothing unfinished at all: every bullet above the 2026-09-18 audit divider is
struck. So a background agent reading the backlog to find out what was wanted
would have found an empty list and a wall of finished work, and the four live
asks were invisible to it. Moved rather than copied, and `HANDOFF.md` points
here now.

- ✅ **DONE 2026-09-24. `/fau/`: *"rm compile button next to fau on"*.** It was
  the only entry left in `.pos-controls` after the presets moved to the panel
  footer on 2026-09-23, so the page now declares no `controls` key at all and
  `shell.mjs` hides the empty row, which it has to: that row carries 14 px under
  it and a band of dead space reads as something that failed to render. `lanes`
  and `draw` were already in that shape.
  ✅ **THE PRESS IT REPLACED WAS NOT MISSING TO BEGIN WITH.** The page compiles
  `AUTO_IDLE_MS` after typing stops, which is what `ONE` and the index line both
  already said in the words a visitor reads, and the switch compiles what is in
  the box the moment it goes on. Neither string needed a word changed, which is
  the tell that the button was a fifth road to the same place.
  🔴 **WHAT IT COST WAS THREE ASSERTS READING `d.button('compile').disabled` AS
  EVIDENCE OF POWER STATE, AND DELETING A CONJUNCT IS COVERAGE LOST AT A COUNT
  THAT DOES NOT MOVE.** The claim those clauses carried, that nothing can start a
  compile on a page nobody switched on, is asserted on the autocompile now: the
  check arms one with the instrument off and measures `autos`, `runs` and
  `node`. It is the better instrument, because a `disabled` attribute is a
  statement about one control and this is a statement about the only road left.
  ⚠️ **AND IT IS TWO ASSERTS RATHER THAN ONE BECAUSE OF LESSONS #113**: the full
  idle wait plus a margin is longer than three quiet polls, so it is split at
  500 ms and each half says something true on its own.
  ✅ **A REAL GUARD MOVED WITH IT.** The deleted handler's own comment recorded
  that the guard belongs INSIDE the queued task and not on the button, because a
  press already on the queue when the switch goes off underneath it is exactly
  the order a check runs in. The autocompile had that hole: `fireAuto` tested
  `powered` before queueing and the queued task never tested it again. It does
  now, before `autos++` so a refused task does not move the counter every
  autocompile assert is written against.
  ⚠️ **TWO COMMENTS WENT STALE THE MOMENT THE ROW EMPTIED** and were rewritten
  rather than deleted: one explaining why `autos` is separate from `runs`, one
  explaining why the whole block is a single `serial`. Both named a harness
  COMPILE press that no longer happens, and both arrangements are still right
  for a reason that outlived it.
  MEASURED: baseline **43/43 with 37 page asserts**, after **45/45 with 39**,
  which is exactly the two added and nothing gone silent, stable across two runs,
  and the page's last assert still runs so nothing was truncated.

- ⚠️ **`/fau/`: *"secondary. should shimmer"*, and it names no subject.** There is
  no shimmer anywhere in `demo/fau/index.html`, MEASURED by grep on 2026-09-24,
  so there is nothing to change and nothing to point at. It needs one word from
  the person who asked: WHAT should shimmer. Blocked on that and not on work.

- ⚠️ **"move instrument to patch seletor below instrument on right, no
  randomizer"**, asked with no page named, and asking got no answer. Candidates
  are the pages that have both an instrument and a patch selector. Blocked.

- 🔴 **THE MK-425C IS DESCRIBED AS A SEMITONE FLAT IN 11 FILES, AND THE CLAIM IS
  NOT WRONG SO MUCH AS UNQUALIFIED.** MEASURED by grep 2026-09-24, excluding
  `archive/` and build output: `demo/evo/index.html`, `demo/bay/index.html` (2
  places), `demo/nola/index.html` (3), `demo/wish/index.html` (2),
  `demo/shell/bay.mjs`, `demo/shell/bay-test.mjs`, plus `PROGRESS.md`,
  `HANDOFF.md`, `measured-devices-2026-09-20.md`, `plans/plan-nola.md` and
  `plans/plan-patchbay.md`.
  ✅ **AND ONLY TWO OF THE 11 ARE TEXT A VISITOR READS**, which is the number
  that matters and which the handoff's "seven files" did not separate:
  `demo/wish/index.html:1354`, the `CHANNELS` entry reading *"Sends on channel 2,
  one semitone flat."*, and `demo/nola/index.html:3923`, a diagram box note
  reading *"The one on this desk also arrives a semitone flat, which is what the
  TRANSPOSE control is for."* The other nine are comments and documents.
  🔴 **THE FACT IS THAT THIS UNIT MEASURED 47 TO 71, NOT THAT THE MODEL IS
  FLAT.** `research/evo-mk425c-face-2026-09-21.md` looked for a starting note in
  all three manual PDFs and it is not there; the MIDI Implementation Chart leaves
  `True Voice` as asterisks, which is the chart declining to answer. **47 to 71
  is consistent with a factory 48 to 72 plus a stored transpose of minus one**,
  and the instrument has a transpose function with exactly that resolution.
  ✅ **AND IT IS TESTABLE FOR FREE, WHICH IS WHY THIS IS NOT A WORDING TASK
  YET.** The manual's non-volatile memory list names controller and channel
  assignments, drawbar mode, DATA LSB and MSB, global channel and last used
  preset. **Octave and transpose are absent from it.** So switch the keyboard off
  and on and play the bottom key. **48 means somebody left a live transpose set
  and the instrument is ordinary. 47 means transpose survives a power cycle and
  the manual's list is incomplete.** Either answer decides how those 11 files get
  worded, and neither costs anything.
  ⚠️ **A FACTORY RESET IS NOT THE FREE TEST.** It is hold `+/-` while switching
  on and it *"will erase all setups stored to memory"*.
  ⚠️ **AND NOBODY IS TO "FIX" THE DRAWING.** `createKeyboard` picks black or
  white from the OFFSET off the base note, so `/evo/`'s `base: 47` draws the
  right C-to-C shaped 25 key picture and only the printed NAMES carry the minus
  one. Changing the key pattern would draw an instrument that does not exist.

- ⚠️ **`/circuit/` reads 33/34 on a printed-names inset.** Pre-existing, and
  proved to be so rather than assumed.

- ⚠️ **`/nola/` timeline order has no assert.**

- 🔴 **NOT SETTLED: WHETHER THE LOOP REALLY KEEPS TIME, AND ONLY A PERSON CAN
  SETTLE IT.** The `/kit/` drift check is COARSE, measured rather than suspected:
  the same sabotage run twice gave **8 ms** of growth over five turns and then
  **1.5 ms**, and 1.5 passes. Separating drift from jitter properly needs about
  twenty turns, which is five seconds, and `verify.mjs` stops growing about two
  seconds after the last new assert. The instrument exists and is committed at
  `demo/resources/read-loop-take.mjs`:

  ```sh
  # open https://positron.studio/nola/?rec=1 , play, loop something, let it turn,
  # press SAVE TAKE, then
  node demo/resources/read-loop-take.mjs ~/Downloads/nola-take-*.json
  ```

  It reads `plays`, which is what SOUNDED with `how` saying finger or lap, and
  not `events`, which is the wire and can say nothing about a loop.

### Done 2026-09-23: the numpad looper, and the `Loop` that ended up on the KEYBOARD instead

🔴 **THE STATE MACHINE SHIPPED AND THE `/nola/` MODE DID NOT, AND BOTH WERE
INSTRUCTED.** Asked as *"Add second mode 'Looped' (move typed to third)"* with
`/evo/`'s numpad driving it, then *"forget about looped button for now"* and
*"lets get num right"*, and finally *"wait make it a keyboard funcion, a button in
bottom rihjt (left from sustain) called 'Loop'"*, closed with *"do not wire nola,
its gloabl keyboard fn. nola gets just chords as if i played htem"*.

✅ **`demo/shell/numloop.mjs` IS THE MACHINE, GRADED WITH NO BROWSER**, 15 checks
in `numloop-test.mjs`. `/num/` is the bench, 19/19, with the telephone keypad, MIDI
in and program change mapping so `/evo/`'s own number keys drive it.
⚠️ **ONE RULE CHANGED WHILE IT WAS BEING BUILT**, asked as *"when doubleclick on
empty slot, it stops others possible loops playing and starts rec"*, so the table
above is wrong in its last row: a double press on an EMPTY slot silences every
other looping slot and records, and only a slot with something in it is cleared.
It stops them rather than clearing them, because *start over* is about what you
can hear.
✅ **`/num/` EARNED ITS KEEP ON THE FIRST RUN** by catching that `onTouch` fired
BEFORE the press was booked, so a page painting its lamp from `pending()` read
false and the key never lit. The arithmetic was right and the handover was not,
which is not a thing grading the state machine would ever have shown.

✅ **AND THE LOOP IS A KEYBOARD FUNCTION, NOT A `/nola/` MODE.** `createKeyboard`
takes `loop: true` and puts a `Loop` toggle left of `Sustain`; the tape attaches at
the `press`/`release` funnel, whose own comment had already named that spot as
where a recorder would go. Playback calls `press(k, 'loop')`, so a looped note
reaches every page's `onDown`/`onUp` exactly as a finger does and `/nola/` hears
chords without knowing a loop exists.
⚠️ **`createToggle` IS TWO STATE AND THIS IS A THREE PRESS CYCLE.** Press two turns
the button off, which is what closes the take, and then quietly puts it back on
with `set(true, true)`. The first version called `set(true)` twice, which fires no
`onChange`, so four movements taped and ZERO notes ever came back.
🔴 **A LAP HAS A FLOOR OF 250 ms AND `/kit/` IS WHAT FOUND IT.** That check presses
four keys with no waiting between them, so the take was a few milliseconds long
and the loop turned **118 times in 260 ms**, which is a stuck note with extra
steps. A person cannot play a take that short but CAN arm the button and press it
again straight away, which is the same take. The floor is on the lap and never on
the events, so two quick notes still play where they fell.
⚠️ **THE `/nola/` PICKER KEPT ITS TWO OPTIONS**, so `modePick.buttons[1]` still
means `Typed` and no check moved by an index.

MEASURED: kit 205/205, nola 89/89, knobs and pack 79/79, num 19/19, numloop 15 ok.
Transport `LOOP` is `Loop` on the bar and in both pages that assert on it.

- ✅ **BOTH PAGES ASSERT THE REFUSAL BOUNDARY NOW, AND THE SABOTAGE IS THE
  PROOF.** 2026-09-18. `/flipper/` 8 page asserts to 11, `/now/` 20 to 23. With
  `fake-err.mjs`'s `serves()` forced to `return true`: **4 red, 2 on each page**,
  RE-RUN INDEPENDENTLY rather than taken on report, and the failure text is
  legible at a glance (`............` where a working run draws `#######.....`).
  The negative controls stay GREEN under the same sabotage, which is what they
  are for. The evidence comes from a survey of all three channels, because the
  one channel a page opens wears one of three shapes and a finder that always
  answered "nothing is blocked" would read exactly like a quiet day.
  ⚠️ **AN EXPIRED SEGMENT LOOKS LIKE A REFUSED ONE AND NEARLY BOUGHT A FLAKE.**
  The first run read `#.......#####`, two boundaries where there is one: the
  oldest probed point fell off the back of the window between the playlist read
  and the ask. `err-live.mjs` fact 2 says to probe only segments from the
  playlist just read, and that is necessary and NOT sufficient, because a
  thirteen point sweep takes seconds and the window slides while it runs.
  Membership has to be evaluated at PROBE time. Points no longer in the freshest
  playlist are dropped and the count is printed.

- ✅ **`/now/` PLAYS THROUGH A REFUSED LIVE EDGE.** `findServedEdge` came out of
  `/flipper/` into `demo/shell/err-live.mjs` and both pages call it, so the
  original is not the only caller. MEASURED against `fake-err.mjs`'s `/wall`:
  **7 page asserts red and a black picture before, 0 red of 23 after**, reading
  `53.1 min behind, and ERR refuses the newest 52.9 min`. LIVE now means the
  newest frame ERR will hand over rather than the newest it lists. Two asserts
  carry two bands, each naming which case it is in, because the page has two
  honest answers.
  ⚠️ **THE HARNESS STILL POINTS `/now/` AT THE DEFAULT ARRANGEMENT**, and this
  time that is a choice rather than a setting standing in for a fix: `/flipper/`
  at `/wall` grades a picture playing through a wall, `/now/` on the default
  grades one at a live edge, so both modes run every time and each page's finder
  is graded against all three shapes by its own survey. One line flips it.

- ✅ **`/flipper/` GOES RED AGAINST A BROADCASTER THAT IS NOT THERE.** MEASURED
  with `?base=` at a closed port: **4 page asserts red of 11**, where all 8 used
  to pass. `the selected channel is open or loading` was satisfied by `!!c.hls`,
  true the instant `new Hls()` returns. It is `the selected channel received
  picture, not just an object` now: `etv 238 fragments, 6542 KB, 165 frames
  decoded` when it works, `0 fragments, 0 KB, 0 frames decoded` when it does not.
  ⚠️ **THE FRAME COUNT IS CUMULATIVE AND THAT IS THE WHOLE TRICK.** `readyState`
  is an instant and the check runs one line after a seek, which empties the
  buffer, so a WORKING page read `readyState=1`. `totalVideoFrames` counts what
  the element has ever decoded and a seek does not reset it.

- ✅ **DONE 2026-09-18. THE CARET BUG, AND IT WAS NEVER THE FILE.** Reported as
  *"there is not caret in arvhice playback"* and diagnosed wrongly TWICE as
  MediaRecorder carrying no cues.
  🔴 **`mediaMaster` DOES NOT RUN ITSELF AND `/stage/` NEVER TICKED IT.** Its own
  docstring says to call it from the rAF loop you already run and `/crate/`
  carries the same warning; the page built the object and drove it zero times,
  so the archive's deck was never once driven by its element. MEASURED: the
  element went to 1.00s of a 3.45s recording, `ended` false, `seekable`
  0.00..3.45, while the deck sat at 3.45s. **`master ticks 0, backstop 0,
  driving false`** is the line that said it, and printing three counters settled
  in one run what guessing had not in three.
  ⚠️ **AND THE SEEK CHECK PASSED THROUGHOUT**, because it asks the ELEMENT where
  it went. Every assert about that archive was on the one side of the join that
  worked.
  ⚠️ **A SECOND, REAL GAP IN SHARED CODE FOUND ON THE WAY**: `mediaMaster`
  listened only for `timeupdate`, and a paused element fires none and produces
  no rvfc frames either. Seek a paused master and every sensor goes quiet at
  once. It listens for `seeked` too now. **`/stage/` is 38/38.**

- ✅ **DONE 2026-09-18. THE AUDIENCE'S WAITING CARD IS GONE.** It said in two
  sentences what the presence badge says in one word. The check that guarded it
  CHANGED rather than going: it read `.pos-card`, and the claim was never about
  a card, it is that the audience is shown no `<video>` before there is anything
  in one.

- ✅ **DONE 2026-09-18. `/stage/` GOT A BACKGROUND, AND IT IS NOT ERR.** Asked as
  *"turn on the err feed in the bg"* and settled a message later with *"i just
  need some video there. look for suitable PD sources? can be historic stuff or
  whatever"*, which dissolved the whole problem: the ask was a picture, not a
  broadcaster. **The Dickson Experimental Sound Film, 1894 or 1895**, the
  earliest known film with live-recorded sound, which is on subject as well as
  free: the first attempt to publish picture and sound together, behind a page
  that publishes picture and sound together.
  🔴 **CHOSEN ON TWO INDEPENDENT PUBLIC DOMAIN GROUNDS RATHER THAN ONE:**
  published 1894, so copyright has expired everywhere, AND the Internet Archive
  item carries an explicit dedication (`licenseurl`
  `creativecommons.org/licenses/publicdomain/`).
  ⚠️ **THE ON-THEME CANDIDATE WAS REJECTED AND THAT IS THE POINT.**
  `corpus.json` holds Kurenniemi's own `Computer Music (1966)`, perfect for this
  and marked `licenceConfidence: LOW`, `holder: uploaded by a member of the
  public`. A public domain mark self-asserted by an anonymous uploader on a 1966
  Finnish film is not a clearance. That field exists so the convenient answer
  does not win for being convenient.
  ⚠️ **FETCHED ONCE AND SERVED FROM OUR OWN ORIGIN.** `demo/resources/`, so
  `/resources/dickson-1894.mp4`, same origin, no CORS, no visitor request
  leaving this site. A public domain film on archive.org is still archive.org's
  server. Provenance in `dickson-1894.json` beside it.
  ⚠️ **11.4 MB to 2.33 MB, a 4.7x saving, SOUND KEPT.** It was stripped first on
  the reasoning that the page mutes the background, which was wrong: the
  live-recorded sound is the entire reason the film matters, and keeping it cost
  0.54 MiB. A file is an artefact, not only an input to one page.
  🔴 **AND THE BUILD SILENTLY DECLINED TO COPY IT.** `.mp4` was not on the
  allowlist, so it shipped the provenance JSON, dropped the film, and reported
  `copied 182 files`. The page would have carried a `<video>` pointing at a 404.
  Third time that allowlist has failed that way, after `.webmanifest` and the
  `dust` excerpts. `.mp4` and `.m4v` added.
  ⚠️ **THE ERR ROUTE IS UNTOUCHED**: still opt-in on `?bg=<slug>`, still
  unreachable by a harness, and the rights question it raises is still the
  user's rather than answered by default.

- ✅ **DONE 2026-09-18. `How it works` LIVES IN THE CONTROL ROOM AND THE
  ARCHIVE.** Two instances from one spec, `atEnd: false` because `atEnd`
  appends to `document.body` and ignores the host. The audience panel gets none.
  🔴 **AND THE CUTS CHECK WOULD HAVE PASSED BY NEVER LOOKING.**
  `getComputedTextLength()` answers 0 under a hidden ancestor, so a diagram in
  an unselected tab reports NO CUTS however badly it is cut. The check asserts
  `dg.measured` and selects each tab first. **MEASURED: both panels measured,
  nothing cut.**

- ✅ **DONE 2026-09-18. START AND STOP ARE A TRANSPORT BAR.** `live: true` so the
  clock is a LIVE chip, `scrub: false`, `loop: false`, and `showDeck` really
  runs, so the playhead is how long the show has been on air. **The check
  PRESSES the bar rather than calling `startShow()`**, because a bar wired to
  the wrong command would have left every assert below it green, measuring a
  show only the check knew how to start.
  🔴 **IT EXPOSED TWO REAL DEFECTS IN SHARED CODE.** `__demo.transport` was
  whichever bar was BUILT LAST, so a page with two bars published the wrong one:
  `publish: false` now lets a page say. And `verify.mjs` clicked
  `document.querySelector(".tbar-toggle")` while asserting about
  `__demo.transport`, which are the same element only on a one-bar page: it
  presses the graded bar's own toggle now, and `el` was added to the api for it.
  **MEASURED: `/stage/` 37/38, and 521/522 across the 21 demos that carry a
  bar**, the one red being the rewind defect above.

- ✅ **DONE 2026-09-18, FOUR SMALL ASKS ON `/stage/` IN ONE PASS.** **35/36**,
  the one red being the rewind defect above.
  - **The archive opens on a 15s window**, MEASURED at 15.0s on screen, and
    **zoom out is bounded at 4x it**. That bound did not exist to be raised:
    `capPps` floored at 1e-30 px/s, so a reader could wheel until a recording
    was a thousandth of a pixel. `maxSpan` is a new strip option, OFF by
    default so none of the other twelve strip pages move, and `/stage/` is its
    first caller. Proved by asking for a thousandfold zoom out and asserting
    where it stopped, with `S.zoom.by` naming `max-span` so a bound that fired
    is distinguishable from a wheel that did nothing.
    ⚠️ **THE BOUND TAKES THE RECORDING WHEN THE RECORDING IS LONGER**, because a
    bound that hides the thing a reader came to look at is a bug rather than a
    bound. And the expression lives in ONE place: it was written twice for one
    run, once in the option and once in the assert grading it, and they
    disagreed immediately.
  - **`diagram cuts: [object Object]` is gone.** A cut is `{ id, where, full,
    shown, width }` and the page joined the objects. `/kit/` had the formatting
    all along, so a page had invented its own way of printing a structure
    another page already printed properly. It is an ASSERT now, not a whispered
    log line, which is how six survived a deploy unread.
  - **And the six cuts were real, at PHONE width only.** Three subs were over
    the box's ~14 characters: `1280x720, 25fps`, `700k, 2s pieces` and `WHIP in,
    WHEP out`. One of the three had been added the same morning.
  - **Every button is secondary.** `Send` no longer carries `pos-pri`.
  - **The question defaults to "Kas Manfred MIM on olemas", Jah and Ei**, third
    option left empty as before.

- ✅ **DONE 2026-09-18. `/now/` AND `/flipper/` CONTACT NOBODY.**
  `demo/fake-err.mjs`, the third stand-in after `fake-station.mjs` and
  `fake-tapes.mjs`, and the last pair of pages still pointed at a broadcaster.
  **MEASURED, and re-run independently rather than taken on report: 52/52 with
  the only hosts contacted being the dev server and the stand-in.** Cold build
  **55.4 s and 105 MB**, cached in the system temporary directory; the media
  playlist is 126 KB over 3600 segments and 120.0 min.
  `demo/shell/err-live.mjs` gained `errUrl()` and a `?base=`, `/now/`'s schedule
  fetch routes through it (it is on `www.err.ee`, and was the one live URL left),
  and `/flipper/` now imports `CHANNELS` rather than holding a fourth copy.
  ⚠️ **IT REPRODUCES THE REFUSALS**: 403 with no `access-control-allow-origin`,
  on rights-blocked segments AND on ones off the back of the window, in the three
  shapes measured on 2026-09-06, verified by a 13-point sweep.
  ⚠️ **NO BURNED CLOCK IN THE PICTURE.** `ffmpegFilters()` needs `drawtext`,
  which needs libfreetype, and the ffmpeg on PATH reports zero of them.
  `src/publish.sh` pins `ffmpeg@7` for this and says so. Skipped rather than
  half-done.
  ⚠️ **AND IT LEFT THREE HOLES BEHIND IT, ALL IN `## Open` ABOVE**, which is the
  point of building the thing: a page nobody could run was a page nobody could
  find holes in.

- ✅ **AND ONE WAS FIXED ON THE SPOT: `/flipper/`'s CHECKS DID NOT RUN ON A
  WALLED CHANNEL.** The `live` handler jumped to the newest served frame and
  `return`ed past the `await d.run('check')` that is the only thing on the page
  that runs them. **2 asserts against 8, and the suite read GREEN having graded
  nothing.** It was invisible because which branch fires depends on what ERR
  happens to be blocking that day. The jump is a function now and the checks sit
  outside it, so none of its three exits can take them.

- ✅ **DONE, AND THE NUMBER IT WAS DECIDED AGAINST WAS NOT IN THE TABLE.** *"What
  we do with r2 save? Show can be 3hr"*, asked 2026-09-18. **THE PICTURE IS
  700 kbit/s AND THE SOUND IS 96, SO A THREE HOUR SHOW IS 1.07 GB**, set on
  `/stage/`'s recorder as `videoBitsPerSecond` and asserted.
  🔴 **WHAT WAS THERE BEFORE WAS THE BROWSER'S DEFAULT, AND IT MEASURES
  2,500 kbit/s.** The page passed no rate at all, so this was never a choice
  between the rows of the table: MEASURED by deleting the rate again and reading
  `videoBitsPerSecond` back off the recorder, three hours of the default is
  **3.38 GB**, worse than the 2 Mbit/s row somebody would have picked as the
  extravagant end, and **134x** the 24 MiB an `ingest` session may hold.
  ⚠️ **AND THE FIRST ANSWER TO THIS WAS 1.167 Mbit/s, WHICH IS A REAL
  MEASUREMENT OF THE WRONG THING.** That is the rate of
  `proto/selfrec/artifacts/a1-concat.webm` (13,134,293 bytes over 90s), and
  selfrec's own note says that file was recorded at a **request** of 1200 kbit/s.
  A rate somebody asked for is not a default. It was believed for an hour
  because it came off a real file with a real number beside it, and what
  corrected it was breaking the assert on purpose.
  **What decided the value, given that the file size is free:**
  - **Money is not an axis.** 1.08 GB in R2 is about 1.6 cents a month and 5,400
    writes about 2.4 cents a show. Every row from 691 MiB to 3.38 GB costs
    nothing worth arguing over, and reaching for cost first is how this sat
    undecided.
  - 🔴 **THE SCARCE THING IS THE UPLOAD, AND IT IS ROUND-TRIP BOUND RATHER THAN
    BANDWIDTH BOUND.** MEASURED in selfrec A2: 13 buffered pieces drained in
    6,816 ms, 524 ms each, against a p50 verify of 483 ms. So an interrupted
    show catches up at about **1.9 pieces a second whatever the bitrate is**,
    and the headroom is set by how many pieces it makes. **At a 2s piece a three
    hour show is 5,400 against 0.5/s of production: 3.8x. At 5s it is 2,160 and
    9.5x.** So the long-show timeslice is **5s**, and it is not 5s on `/stage/`,
    whose shows are seconds long and would produce no piece at all before being
    stopped.
  - ⚠️ **Seeking does not pay for the longer piece**: `proto/selfrec/indexer.mjs
    --blocks` indexes per SimpleBlock, not per cluster.
  - ⚠️ **Audio is not where a saving is and is not cut.** 96k over three hours is
    130 MB of the 1.07 GB, and it is the only track carrying the question and
    the answers. `/stage/` records one video track today, so `AUDIO_BPS` is
    declared and deliberately NOT passed: a rate for a track that is not there
    is a setting that reads as correct and does nothing, which this page has
    already paid for twice.
  ⚠️ **WHAT IS STILL OPEN IS THE PLAYBACK PATH, NOT THE NUMBER.** `fetchBack`
  builds ONE Blob and a gigabyte cannot go in memory; `indexer.mjs` plus Range
  and MSE is the answer and is written. `/stage/` uses the `ingest` open tier,
  which is 4.2 minutes at this rate, so the worker swap to `selfrec` is
  untouched by this entry.
  ⚠️ **THE PROTO'S OWN DEFAULTS WERE LEFT ALONE ON PURPOSE.**
  `proto/selfrec/participant.html` still defaults to `kbps=1200` and
  `timeslice=2000`, because those are the values its recorded baselines were
  measured at and changing them silently would invalidate its NOTES.

- ✅ **DONE. follow TRACKS THE NEWEST FACT ON THE STRIP, WHICH DURING A SHOW IS
  THE WRITE HEAD.** *"What to do with follow"*, asked 2026-09-18. The open half
  was never the control, it was the TARGET: during playback it follows the
  playhead, and a live show has no playhead at all.
  🔴 **`followTarget` ON `createStripView`, PLUS `setFollowTarget(fn)` AT
  RUNTIME.** Null means the playhead, which is what every page before `/stage/`
  did. `/stage/` calls `armWall(0)` when the recorder starts, which makes
  `wallPos()` the write head and draws it as the wall cursor, and passes
  `() => wallPos()`. The handover at the end of the show is `setFollowTarget(null)`
  plus the new `disarmWall()`, and it does NOT re-engage follow: somebody who
  dragged the strip during the show stays where they dragged it.
  🔴 **AND THE STRIP WOULD HAVE FROZEN, WHICH IS THE HALF THAT NEARLY SHIPPED
  INERT.** Its loop repainted on `S.dirty || p !== S.pos || (wallAnchor &&
  deck.playing())`. On this page nothing is playing while a show records, so
  every term was false, the strip never redrew, and `followTick` never ran: a
  live show's timeline would have stood still while its own rows arrived, with
  every line of the new code correct. **An armed wall is a real-time cursor, so
  it now repaints on `S.wallAnchor` alone** and the way out is `disarmWall()`.
  ⚠️ **THE WINDOW IS A CEILING, NOT A WIDTH.** `LIVE_WINDOW_MS` is ten minutes,
  and the view opens on `min(showLength, window)`: at 1280 px a three hour show
  is 8.3 s per pixel, where a two minute question is 14 px and an answer is
  sub-pixel, and ten minutes puts that question at about 240 px. A short show
  fits whole and the window changes nothing, which is every show `/stage/` has
  recorded.
  🔴 **AND THE FIRST TWO ASSERTS WERE BLIND AND PASSED THE SABOTAGE 32/32.**
  They checked `followsPlayhead === false`, a finite `followPos`, and a window
  that MOVED. With `followPos` made to ignore the target and return the
  playhead: `followsPlayhead` reports the SETTING rather than the behaviour so
  it stayed true; the harness had seeked the playhead to 90s so `followPos` was
  large and finite; and a window chasing a playhead 90s away moved **17,119 px**,
  which passes "it moved" with room to spare. They compare `followPos` against
  the WRITE HEAD now, and require the write head to be ON SCREEN at the end.
  **MEASURED: `/stage/` 32/32, up from 28. Three deliberate sabotages take it to
  30/32, 31/32 and 31/32**, and the failure text names the real symptom each
  time (`sits -16446 px into a 576 px window`; `moved 0 px`; `reports 2500
  kbit/s`). **404/404 across the other eighteen strip demos**, keep and take
  included, which are the other pages that arm a wall.
  ⚠️ `now` AND `flipper` WERE NOT RUN. They sweep ERR segments, and nothing
  about this change is worth a public broadcaster's listener figures.

- ✅ **DONE. `/tapes/` HAS A STAND-IN, AND `node demo/verify.mjs tapes` COSTS
  archive.org NOTHING.** Asked because that harness pulled twenty-four real
  recordings on every run, including the runs where somebody typed no arguments
  at all, against the 2026-09-16 instruction *"stil: super careful with external
  sources, better avoid"*. `demo/fake-tapes.mjs` is the same answer
  `fake-station.mjs` gave `/radio/`: real MP3 frames, real `content-length`,
  `accept-ranges: bytes`, working Range replies and archive.org's CORS headers,
  at the exact lengths `corpus.json` measured. `/tapes/` takes a `?base=` the way
  `/radio/` does and `verify.mjs` starts the server and points the page at it.
  **MEASURED: 38/38 green, 26 page asserts, and the only hosts the run touched
  were the dev server and the stand-in.** The instrument is new too:
  `DEMO_HOSTS=1 node demo/verify.mjs <slug>` prints the hosts each demo
  contacted, off `Network.requestWillBeSent`, so "no bytes left this machine" is
  checkable rather than claimed.
  ⚠️ **AND IT EXPOSED TWO VACUOUS PASSES IN THE PAGE'S OWN CHECKS, WHICH ARE NOT
  FIXED.** A stand-in serving every recording at HALF its corpus length reads
  38/38, because every geometry assert takes its lengths from the corpus and
  none of them ever compares that against the file the element loaded. And a
  stand-in serving SILENCE also reads 38/38: `the page makes no sound until
  somebody presses play` printed `ran 265 ms of tape at 0.000 and the speakers
  got 0.0000`, which cannot tell a shut gate from nothing to gate, and
  `backwards is the same samples mirrored` reported `4 of 4` zeros matching
  zeros. Both need a real measurement to sit behind, and the tolerance for the
  first one cannot be chosen here: the corpus durations came from ffprobe on a
  header, so what a browser reports for the same file is unmeasured and may not
  be measured without asking archive.org for the files.

- ✅ **THE PAGE IS A STACK OF BLOCKS AND THE STACK OWNS THE AIR BETWEEN THEM.**
  Asked twice on 2026-09-16, the second time as a diagnosis rather than a
  request: *"same vert space beween as we establised in knob (make a rule and
  uptada others in bg: make it easy to change later)"*, then *"you can not
  follow spacing tule. make reusable layout component?"*. `demo/shell/stack.mjs`
  plus `.pos-stack` in `shell.css`; the number is `--pos-gap` on `:root` and
  nothing else states it. MEASURED on 38 pages before and after: every gap
  between two blocks is now exactly 40 px, where before there were 0, 10, 12,
  14, 16, 18, 40 and 53.5. `/keys/` was the photograph (0.0 px between the
  transport bar and the keyboard) and `/knobs/` was the reference and did not
  move, gap for gap.

- ✅ **AN IDLE LOOP PAIR WEARS THE SAME EDGE AS THE BUTTONS BESIDE IT.** Asked
  2026-09-16 with a photograph: *"global: loop buton borders as rest of
  button"*, the fourth report about this pair. MEASURED on `/draw/` before the
  repair: the pair read `rgb(106, 114, 128)` (`--dim2`, text grey) while every
  rate button and every ordinary button read `rgb(43, 53, 70)` (`--line2`). The
  repair was to DELETE the declaration rather than restate a colour: both halves
  are `<button>` and the base rule already gives them the edge. `/draw/` now
  asserts it, and the assert goes red when the old declaration is put back.

- ✅ **`/keys/` OPENS ON `AddSynth Morph`.** Asked as *"addsynth morph as default
  patch"*. Bank 115, program 32, addressed by bank and program rather than by a
  position in a flattened list of 911. It is SENT as well as pointed at, and the
  page says in its log which patch it opened on, or says so when that bank and
  program are not in the board's library.

- ✅ **FLUIDSYNTH AND HEXTER ARE OFF THE BOARD AND OUT OF THE PAGE**, to
  `archive/box-fluidsynth-hexter/`. Asked as *"lets remove fluidynth and hexter
  code and move to arvhice (in browser and in board). update board."* There is
  ONE jackd, ONE capture and ONE room on that board, so an instrument picker was
  a control that took the sound away from somebody in another building: `/knobs/`
  was found refusing to start because somebody had pressed `sampled`. Board
  restarted 22:44:41 and yoshimi confirmed up, `jack: true`, `yoshimi:left`,
  50 frames/s. MEASURED that the deploy landed: `md5` of `board.mjs` and
  `jacksynth.mjs` identical board against local, and the board's own copy of
  that file answers `JACK_SYNTHS: yoshimi`.
  ⚠️ It found a real defect on the way past: `/grains/` asked the board for
  `fluidsynth` while waiting for a reply naming `yoshimi`, so `wantSource` was
  never cleared and the mark it gates stayed armed for a whole visit.

- ✅ **THE `box` DEMO IS `keys`.** Asked as *"rename box demo to keys"*. 119
  references in 30 files, swept on the URL form rather than the word, so
  `rig/board/` is untouched: the BOARD is still the box. The source file did not
  move and `LAYOUT.md` rule 2 is why. The deployed `/box/` is gone and no
  redirect was written, same as `radio1965`.

- ✅ **`demo/shell/board.mjs`: ONE MODULE FOR THE RASPBERRY PI.** Asked as
  *"share code with knobs"*. `/keys/` stopped hand-rolling its WebSocket, its
  12-byte frame header, its int16 conversion, its `pcm-playout` worklet, its
  cushion and its counters; it GAINED three things it never had, because the
  module is the better of the two halves rather than the average — a full room
  told apart from a dead relay, a frame checked against the shape the board
  publishes, and the board identified by the messages only it sends.

- ✅ **ONE DIAGRAM, TWO VARIATIONS.** Asked as *"current box diagram is so much
  nicer. unify the diagrams to look best and have knobs and keys variations of
  this"*. Both draw the same ring now: out along the top, down the board, back
  along the bottom. `/knobs/` gained the split relay that makes it read one way
  round, `/keys/` gained the JACK and ffmpeg split. Both report `cuts: 0`.

- ✅ **`/keys/` HAS A TRANSPORT BAR WITH NO PLAY BUTTON.** Asked as *"bring
  transport bar to keys but no play button, just online badge. plush
  readout+logs"*. `transport-bar.mjs` takes `toggle: false`, in the same family
  as `scrub: false` and `loop: false`, and `demo/verify.mjs` reads
  `api.toggles` before pressing a button that may not be there.

- ✅ **IDA AND RADIO 1965 ARE BACK, LAST IN THE LIST, ON THE TEE.** Asked as
  *"bring ida's back to radio (if single listener)"*, *"bring ida to videoradio
  too"* and *"bring back radio65 stream as last. we are single user connected?"*.
  The condition was checked off the code, not remembered. NEITHER OPERATOR HAS
  BEEN RE-ASKED: what changed is the size of the claim, not their permission.
  Both are LAST because being at the front is what did the damage.

- ✅ **THE `/videoradio/` HEADSET HALF AND ITS SEA ARE ARCHIVED**, to
  `archive/videoradio-xr/` with the plan and a README of what the three device
  runs bought. Stage B was never written and now never will be here.

- ✅ **A RATE LATTICE OF ONE DRAWS NOTHING.** `buildRates()` tested
  `lattice.length`, so a cue lane declaring `caps: { rates: [1] }` produced a
  single armed radio button with nothing to choose it against: *"what this
  disconnected 1 does here?"*. Checked before changing it that `jam` and `kit`
  are the only other single-rate declarations and neither asserts on the row.


- ✅ **`/seek/` IS RETIRED.** *"rm seek demo"*. `git mv` to
  `archive/demos/seek-index.html`, its row out of `DEMOS`, and 5 real slug
  references swept of 30 slug-shaped candidates: the manifest row, the manifest
  prose that paired it with `replay`, a `verify.mjs` comment citing its 700 ms
  sweep, and a plan pointer. The other 25 are `st.reason === 'seek'` in the
  transport and history in old plans, which an archive is allowed to keep.
  ⚠️ IT ORPHANED NO COVERAGE, checked rather than assumed: its comment claimed
  *"exactly one page has to prove it works"* about the shared loop check, and
  `replay`, `radio` and `tapes` all press `pressLoop()` and assert on the wrap.
  MEASURED after: 46 rows, 43 built, `seek` absent, scratch build passes with no
  missing import, and the archived page still parses.

- ✅ **`/replay/`, ALL SIX.** 18/18 before, 22/22 after; page asserts 6 to 10.
  The lone yellow `1` was a rate radio group with ONE option, from a cue lane
  declaring `caps: { rates: [1] }`. The loop bug was real: the bar wraps by
  seeking, the deck is a `mediaMaster` FOLLOWER of the video, so every wrap was
  undone by the master's next tick while the clock climbed. It passes
  `command: { play, pause, seek }` now, the way `/tapes/` already did. Load and
  Play are gone, the transport's play does it. `what` is the manifest's `one`
  line. A diagram, `cuts` asserted at 0. Sabotage: deleting the one line that
  writes `video.currentTime` takes it red at `1.99 s against a ceiling of 1.25`.
  ⚠️ THE LOOPER WAS REFUSED IN WRITING AND CORRECTLY: it owns a direction by
  holding the sound, and `/replay/` loops a `<video>` with no `AudioContext` on
  the page. It got the kit's BUTTON without the kit's mechanism, disabled with
  the reason on its face. The lift is in this file.

- ✅ **ISOLATED DEPLOYS, PLANNED AND ANSWERED NO.** `plans/plan-isolated-deploys.md`.
  46% of deployed bytes are shared and 45 of 46 pages import `shell.mjs`, so
  per-slug subdomains cost 44 Workers and about 179 MB a deploy to buy TIMING
  isolation over code that stays shared BY SOURCE. `wrangler versions upload
  --preview-alias` instead, which is wired as `workers/view/preview.mjs` and
  MEASURED at 11 s with production untouched.

⚠️ These stay. A struck line is how a repeat request is recognised as a
repeat, and several of these were asked for more than once.

- ✅ **DONE. `/replay/`, ALL SIX, ASKED 2026-09-16 WITH A SCREENSHOT.**
  MEASURED: **18/18 before, 22/22 after**, `node demo/verify.mjs replay`.
  1. *"transport loops but video does not, time keeps increasing"* was real and
     is fixed. The bar wraps a loop by SEEKING, and with no `command` a seek
     goes to the deck; the deck on that page is a FOLLOWER of the picture, so
     `mediaMaster` undid every wrap within a quarter of a second while the show
     ran on. The page now passes `command`, so play, pause and seek all drive
     the `<video>` and the deck follows, which is what `/tapes/` already did.
     GRADED: the check sets a loop through the real button, plays two laps and
     watches `video.currentTime`. Green it reads *the picture ran 0.81 s from
     the loop start and reached 95.81 s, against a ceiling of 96.25 s*; with the
     one line that seeks the element deleted it reads **1.99 s against a ceiling
     of 1.25 s** and goes red.
  2. *"what this disconnected 1 does here?"* was the rate radio group with ONE
     option in it, from the cue lane declaring `caps.rates: [1]`. The lane no
     longer declares a lattice, because a playhead that follows a picture has no
     speed to arm. The bar's half of it is open above.
  3. *"rm load and play, transport play should do it"*. Gone. ▸ attaches the
     manifest, starts the picture and starts the playhead; `play()` is fired and
     never awaited. The page now declares no controls at all.
  4. *"does not have global loop button with mode, just a single loop"*. The
     kit's `→` is on the bar in the kit's group, disabled with the reason on it.
     The refusal and what would lift it are open above.
  5. *"desc: single sentence only"*. The `what` is the index's own `one` line.
  6. *"add 'how it works' section"*. A `createDiagram` picture, last on the page,
     seven boxes in two machines, asserting its own `cuts` at 0.
  ⚠️ The manifest row grew `settleMs: 6000`: with no controls the page's checks
  hang off a press the harness makes BEFORE its control loop, and that number is
  what sizes the wait for a page's first assert.

- ✅ **DONE. THE L
- ✅ **SESSION 31 CLEARED THESE, ALL DEPLOYED AT `b2bddd2-092128-ad26`.**
  The full account, with what each one cost, is in `HANDOFF.md`.

- ✅ **`/videoradio/` VR IS TO BE ARCHIVED. ASKED 2026-09-16:** *"arvhice
  videoradio vr, it did not worked out"*. The headset half comes out of the live
  page and goes to `archive/`: the `Run in VR` control and its row, `makeXR`,
  `xrPreview`, the `createXRPanels` import, the session's own sea and the two
  asserts that go through `preview()`. The WINDOW sea stays, because the same
  message asks for it to be changed rather than removed.

- ✅ **MOVE `/videoradio/` TO THE `vain` GROUP. ASKED 2026-09-16:** *"move
  videoradio to vain group"*. Front-page grouping, in `demo/shell/manifest.mjs`.

- ✅ **REMOVE THE LEAVE-FULL-SCREEN BUTTON ON `/videoradio/`. ASKED 2026-09-16:**
  *"rm \"back from fullcreen\" button in videoraio"*. The `⤡` in the bottom
  left of the pane (`outBtn`).

- ✅ **THE LOOP PAIR IS TWO DIFFERENT BORDERS AND THE ARROW IS NOT SQUARE. ASKED
  2026-09-16 WITH A SCREENSHOT:** *"loop buttons should have same border color.
  arrow button square size"*. In the picture `LOOP` carries a dim border and the
  → glued to it carries a bright one, so one control reads as two, and the arrow
  half is wider than it is tall. `demo/shell/looper.mjs` owns both.

- ✅ **`dub` AS THE DEFAULT PRESET. ASKED 2026-09-16:** *"dub as default preset"*.

- ✅ **THE PLAY BUTTON CHANGES SIZE WHEN IT BECOMES PAUSE. ASKED 2026-09-16 WITH A
  SCREENSHOT:** *"play button is always square"*. `▶` and `❚❚` are different
  widths, so a button sized by its content resizes on every press.

- ✅ **`/videoradio/` SHOULD USE THE STANDARD TRANSPORT BAR. ASKED 2026-09-16 WITH
  A SCREENSHOT:** *"use standard transport bar here (LIVE badge as in radio).
  fullscreen button replaces loop"*. Today it has a hand-rolled `.vr-bar` of two
  buttons, which is the fourth-copy-of-a-component failure CLAUDE.md names.
  `createTransportBar` with `live: true` draws the LIVE chip `/radio/` uses, and
  the ⛶ goes in the slot the LOOP button occupies there.

- ✅ **`/tapes/` STILL LOADS AND PLAYS ON PAGE LOAD. REPORTED 2026-09-16 AGAINST
  THE DEPLOY**, <https://positron.studio/tapes/>: *"tapes still does some
  loading and playback on page load"*, and *"omg you still do not get it"*,
  which is the second half of the report and says this has been asked before.
  ⚠️ THE LAST SESSION FIXED A DIFFERENT THING AND CLAIMED THIS ONE. What it
  removed was twenty-four `preload = 'metadata'` requests to archive.org, and
  the handoff then wrote *"the page opens NO media elements at load"*. A visitor
  is still getting sound and still getting a fetch, so whatever is doing it was
  never the thing that was measured.

- ✅ **CHROME DROPS OUT OF FULL SCREEN WHEN THE RADIO SOURCE CHANGES. NAMED
  2026-09-16:** *"chrome drops out of fullscreen when radio source changes. just
  take it as a fact and try to work to avoid it. or do tests around to replicate
  and find solution."* This is almost certainly the same fault as the standing
  *"`/videoradio/` drops out of full screen after 22 to 25 seconds"* item, which
  has been open since session 28 and unexplained: the tour changes station on
  roughly that period, so the clock everyone was looking for was the station
  rotation rather than a timer.
  ⚠️ **THE TERMS OF THE WORK WERE SET WITH IT AND THEY ARE NOT OPTIONAL:** *"be
  very gentle make sure proxy tee work and no assersions on live items. this is
  very gentle r&d"*. So: no assert loops against live mounts, and whatever is
  built has to confirm the tee is still holding one upstream.

- ✅ **`/keys/`: A DIAGRAM, A LAG READOUT, AND DROP THE COLLECTION LINE. ASKED
  2026-09-16:** *"add diagram to box demo. i want lag readout. rm
  Will_Godfrey_Collection · 657 of 878"*, then *"add 'patch' label to patch
  selector"*.

- ✅ **`/crate/`: CLICKING A FILE PLAYS IT. ASKED 2026-09-16:** *"no table rework.
  just make clickin files playable"*. Narrows the older three-part ask to one
  part and explicitly refuses the rest: leave the table alone.

- ✅ **`/tapes/`: THE NO-WAVEFORM LINE IS UNREADABLE AND THE EMPTY BOX LOOKS
  BROKEN. ASKED 2026-09-16:** *"what does it mean. many kureniemis do not
  play"*, against `Computer Music: its host will not share this file with a
  page, so it plays with no waveform`, printed in the log's FAULT colour with a
  blank bordered box above it.

- ✅ **`/replay/` DOES NOT SAY WHERE THE CUES COME FROM. ASKED 2026-09-16:**
  *"https://positron.studio/replay/ does not say where from the cues come"*.
  The page draws eight operator cues on the strip and nothing on it says who
  made them or when.

ENGTHS ARE MEASURED AND THEY ARE IN THE CORPUS.** Asked as
  *"also do measure file lengths gently and write to corpus and use them"*.
  `demo/resources/measure-durations.mjs` asked all 26 time-based files with
  ffprobe, ONE AT A TIME, two seconds apart, at `-probesize 65536` so it reads a
  header rather than half a recording: **26 of 26 answered**, including a 990 MB
  AVI (52 min) and a 225 MB MPEG program stream (4 min). They live in
  `demo/resources/durations.json`, `build-corpus.mjs` merges them, and
  `corpus.json` now carries `durationMs` on those 26 rows and a `durations`
  block saying who measured them and when.
  ⚠️ MERGED THROUGH THE GENERATOR WITH `--offline`, which asks no source
  anything: MEASURED byte for byte identical to the committed file apart from
  its timestamp, then 26 rows changed and every change was the new field alone.
  ⚠️ AND `/tapes/` USES THEM: the run is drawn at its real length in the first
  frame and the page opens no media elements at load. It was twenty-four
  `preload = 'metadata'` requests to archive.org on every visit, correcting the
  picture over the following seconds. 24 of 24 measured, 1.2 to 13.8 minutes.

- ✅ **DONE. THE LOOPING UI IS GLOBAL AND `/tapes/` HAS IT.** Asked as *"make it
  use same looping ui as radio (make it global)"*. `demo/shell/looper.mjs` owns
  the ring, the kept buffer, the mirror, the voice, the head fraction and the
  button that cycles → ← ⇆; `/radio/` lost 222 lines to it and `/tapes/` gained
  the whole instrument. MEASURED: radio **48/48** against the stand-in and tapes
  **37/37**, with the tape's own check proving backwards is the same samples
  mirrored (4 of 4) and a sabotage of `reversedCopy` taking it red.
  ⚠️ `/tapes/` keeps the FIRST LAP off the tape and plays every lap after it off
  the ring, because a media element has no negative playback rate.

- ✅ **DONE. THE DRAWN TAPE HEIGHT IS GRADED, IN PIXELS.** The 2026-09-15 ask
  *"add 2x height to timeline (same tape h)"* was implemented and graded by
  nothing. The check scans the canvas for the tallest run of ink inside the lane
  rather than re-deriving `height - barPad * 2`, which would have been comparing
  an answer with itself: **22 px of tape over 122 columns in a 64 px lane**, and
  `barPad: 8` takes it to 48 px and red.

- ✅ **DONE. `/tapes/` SAYS IT IS LOADING, AND THE PICTURE MOVES ITSELF.** Asked
  as *"Loading on entry, selfmiving zoom"*. The name line says `finding the
  recordings` until there is something to name, the strip pulses until it has
  bars, and once the run is known the window opens on the WHOLE two and a half
  hours and closes onto an hour over 1.2 s, then slides along with the tape and
  stops at both ends of the run. MEASURED: **38 frames from 142 minutes wide
  down to 60, 16 of them in between**; a playhead at 118.5 min brings the window
  from -1.2 to 81.2 min. Both stop the instant a hand touches the strip, and
  both go red under sabotage.

- ✅ **DONE, AND IT UNBLOCKED A PAGE NOBODY WAS ALLOWED TO RUN.**
  `demo/fake-station.mjs` is an Icecast mount that is nobody's radio station:
  real MP3 frames, real ICY headers, a real text channel, a `/health` route in
  the relay's shape, paced at 128 kbit/s. `verify.mjs` starts it itself whenever
  `radio` is in the run. **48/48 green with zero bytes from ERR**, which is how
  the looper refactor was graded at all.

- ✅ **DONE. Space between the walk buttons and the scrub knob.** *"add space
  between"*, with a picture of them almost touching. `.tbar-head` is 10 px wide
  and centred on its position, so at 0 it hangs 5 px past the track's left edge
  and at the end 5 px past the right. The row's `gap: 8px` is measured to the
  TRACK, which is invisible, so what was actually between the button and the
  knob was **3 px**. The track now carries `margin: 0 5px`, the knob's own
  radius, so the ink you can see gets the 8 px every other member gets.
  ⚠️ Not a bigger row gap: that gap is shared by every member and was tuned to
  8 to stop the bar wrapping to two rows, so raising it to fix one edge would
  push the rate group onto a second line on the pages that only just fit.
- ✅ **DONE. `buffer` and `lost` are on screen, and they are a PAIR.**
  The readout went four cells to six rather than swapping one out: five is not
  available (`mount()` throws on an odd count) and `moving` was not the weakest
  cell, it just looked like it beside two counters nobody could see.
  `lost` is `underruns + dropped`, what went missing after the stream settled.
  ⚠️ `skipped` is deliberately NOT in it: that is the opening burst trim,
  windowed to four seconds, and it reads 53 on a perfectly healthy start. A
  number that alarms every time is a number nobody reads twice.
  🔴 And `buffer` is the cell that earns its place, because `lost` reads 0 on a
  healthy stream while `buffer` moves the whole time and falls FIRST. A new
  assert grades the distance the old one could not see: `no gap past a 1 s
  buffer` passes at 345 ms and at 990 ms alike. MEASURED on this desktop,
  **515 ms of sound in hand at the tightest against a 112 ms worst gap, 403 ms
  spare**, and 515 is under the 600 ms floor here too, so the iPhone was not
  special and the per-station `floorMs` item below is the right next move.
  It doubles as the plumbing check: `tightest` is written only where the two
  cells are written, so a finite value proves they were fed rather than left at
  one em dash.
- ✅ **FIXED, AND IT NEEDED A MASTER GAIN RATHER THAN ONE MORE WIRE.** `sink`
  was fed by the station's path and the loop's gain while the engine left the
  page by a route of its own, so with the fader hard over to the granulator the
  meter read **0.0000 over a signal that was playing perfectly** and every check
  standing on it passed by measuring nothing. `speakers` is now the one way out
  and the analyser hangs off it alone.
  ⚠️ Graded three ways at once, because each kills a different vacuous pass: the
  meter reads the grains, the station's gain is at zero so the grains are what
  it read, and the same window with the output muted reads under an eighth.
- ✅ **IDA STAYS ON THE RELAY. DECIDED, do not re-litigate.** The agent that
  wired it recommended fetching direct, since IDA has TLS and CORS and needs no
  proxy. Overruled for ONE PIPELINE: `srcOf(id)` is one path for every station
  and nothing branches on which, so a station fetched another way would be a
  second path only one station takes.
  ⚠️ And the hop is not a cost. MEASURED, time to first byte, three runs each:
  relayed 0.185 / 0.325 / 0.256 s against direct 0.397 / 0.447 / 0.444 s. The
  relay is FASTER every time, because Cloudflare's edge is nearer than their
  server. What it does cost is egress: 320 kbit/s is 144 MB per listener-hour.
  Written up in `workers/shout/NOTES.md`.
- ✅ **DONE. Varispeed with inertia on the walk buttons.** Playing: the rate eases
  to a 0.0625 floor over 260 ms, the reel changes at the bottom, and it climbs
  back over 420 ms. Measured from outside: floor at 255 to 265 ms, full speed at
  689 to 693 ms against 680 declared. `preservesPitch = false`, so the pitch
  follows and the speed buttons are varispeed too.
  ⚠️ PAUSED, THERE IS NO ARC AT ALL. Nothing standing still has momentum, and a
  ramp over silence is a control that visibly does nothing while costing two
  thirds of a second. Asserted either side.
  ⚠️ AND INERTIA IS TOLD APART FROM A STALL BY MEASUREMENT: the climb's rate
  curve has a known mean, so the tape it SHOULD have moved is known and compared
  with what `currentTime` actually moved. 0 ms of 289 on a cold reel, 290 to 294
  of 289 when the tape was there.
- ✅ **DONE, and the time was not where the comments assumed.** `await
  audio.play()` was the flake: it settles when the DECODER has started, not when
  playing is allowed, measured 1.1 s warm and **5.9 s cold**, and awaited twice.
  That is CLAUDE.md's "never let sound gate the work" inside this repo's own
  file. Also: the loop check was seeking 20% into a 200 MB archive.org file, so
  a range request stalled `readyState` for up to 12 s; its marks are at the head
  now, where the page has already buffered. Ready time median **3626 to 2472 ms**,
  worst **9189 to 5529**, ten runs each. No check was weakened.
- ✅ **CLEARED, and the diagnosis held.** MEASURED now: all EIGHT stations up,
  `radio` 200 included, plus both IDA channels. It was between Cloudflare's
  edge and ERR for three mounts, exactly as the two-mounts-still-200 control
  said, and it needed nothing from us.
  `/radio/` re-run against the REAL relay is **43/43 green**, naming Radio
  1965 itself rather than falling back, with the tempo lock reading
  `23.00000 whole laps, 0.000 thousandths out`. The presets had only ever been
  verified against a stand-in; they are now verified for real.
  ⚠️ And IDA plays on the DEPLOYED page: 816 frames in, 816 decoded, 0 errors,
  framing `adts`, codec `mp4a.40.2`.
- ✅ **FIXED, AND IT WAS FAR WORSE THAN 32 AND 30.** The shell's two asserts at t+0 disarmed `verify.mjs`'s first-assert wait on EVERY shelled page, so the page reported **2 of 43** and the suite said `13/13 green`. The shell publishes `shellAsserts` now and the harness asks the question it means. 43/43. LESSONS #95.
- ✅ **DONE, and without the clock**, which was cut on instruction (*"jsut back to back tapes"*). The 24 tapes run end to end from nought, each as wide as it really is, one lane declared the way `/loops/` declares its lanes. The `LANES` table, `buildLanes()` and the `packRows` packer are all gone.
- ✅ **DONE. The loop's three marks on the wave.**
- ✅ **DONE. The speed row is gone and replaced.** Not repurposed this time: the
  `0.0625 … 1` lattice came off the transport adapter and a four-cell `loop` row
  took its place, greyed until a loop runs. Each cell is a different MECHANISM,
  not a different number of one: `round` the kept seconds as they arrived,
  `back` the same samples mirrored, `half` the same lap an octave down and
  bit-exact at 768000 samples, `chop` a sixteenth of the lap with the grains
  retuned to it. Three of the four are things a live stream cannot do at all.
  ⚠️ `drift` was REFUSED: a wandering tape cannot be told from a broken clock by
  ear, and it would unpick the tempo lock.
- ✅ **FIXED. The push path was broken in BOTH directions by one missing value.**
  `FCM_TOPIC` was not in `workers/items/wrangler.jsonc` at all, so `announce()`
  threw on every publish AND `POST /subscribe` had no topic to join a device to.
  Nothing had ever been subscribed to a correctly named topic, which is why
  choosing one was safe. It is a `var` rather than a secret: a topic name is a
  public channel name every subscriber must know, and `FIREBASE_SA` beside it is
  the thing that must stay secret.
  MEASURED after: `has_topic: true`, and a probe published into the real room
  came back with **`announced_at=1789484181710`**, the first stamp that room has
  ever carried. Probes cleared; the room hands over empty.
  ⚠️ The name is `positron-items`. Changing it means every device re-subscribes.
- ✅ **Lane label. DONE.** The swatch is now as tall as the text beside it (9 px
  for a name alone, 14 where there is a sub-label under it), the name sits
  higher when it is alone, and it carries the lane's own colour mixed 42% into
  the ink. The name used to be `T.ink` on every lane, so on a strip of six the
  names were six identical greys beside six coloured ticks and joining them up
  was the reader's job.
- ✅ The 14 corpus corrections survive a rebuild. The values live in
  `proto/deck/ingest.mjs` (twelve) and `demo/resources/build-corpus.mjs` (two),
  both generators reproduce them, and three guards refuse rather than drop them.
  Every `proto/aikajana` reference is gone from the two generated files and from
  `proto/deck/verify.mjs`, which had been navigating to a 404.
- ✅ 🔴 And the rebuild found a second, larger defect: the `kurenniemi` ->
  `resources` rename matched BARE WORDS inside `build-corpus.mjs` and corrupted
  twelve string literals, including three record filters and two live host
  paths. A full rebuild returned **285 rows instead of 334**, with Zenodo
  keeping 0 of 28 and archive.org 0 of 15. Repaired; 334 again.
- ✅ `/resources/` reads `when.how` and `when.note`. The date cell says who the
  date comes from and how wide the bracket is, in two short lines; the row says
  what the record is and why its date is not narrower.
- ✅ `/tapes/`: playhead off the map, loaded tape ringed and the rest dimmed, press
  a mark to load, rate control fixed, load blip gated, loop freezes the wave
  instead of rescaling it, labels legible with real padding.
- ✅ `weight`: the sentence across four walls, size from word length, sentence case,
  textarea of three lines, live rebuild on every keystroke, readout removed.
- ✅ Live loop with a blinking button and no scrollbar; frozen waveform playhead;
  both joined on `/radio/` and `/tapes/`.
- ✅ `/radio/`: it now KEEPS the audio and plays it back, measured at the
  destination. Boxes fade in together on first sound. Scope window widened to
  the granulator's buffer, which had been silently dropping the oldest quarter.
- ✅ Diagrams: 1 px border on every kind, less saturated edges, centred ties,
  no hue on a name whose box paints none, no articles in labels, notes name the
  technology, service worker inside the phone, two phones for the fan-out.
- ✅ Tables: `/wire/` and `/items/` on `table.mjs`, no header fill, more padding,
  and the component added to `/kit/` with its negative control.
- ✅ `/kit/`: mounts the shell, 8 asserts, graded by the suite for the first time.
- ✅ `mirror`: hold-to-quit badge, and the LOOK control swapped to `createPicker`.
- ✅ Readouts removed from `items`, `weight`, `wire`.
- ✅ `shout` carries Radio 1965's recordings at `/rec/<name>.mp3`.
- ✅ `NOTES` emptied, both essays moved to `research/`, `/notes/` no longer built.
- ✅ `LESSONS.md` renumbering, and the rule about it.



## Moved out of Open by the audit of 2026-09-18

Struck because the work exists, with the evidence that showed it.

- ✅ **THE LIVE BADGE IS OFF THE ARCHIVE PANEL, 2026-09-18.** MEASURED across
  the three panels: audience `live`, control room `live`, archive empty.
  ⚠️ **NOT RE-WORDED TO `archive`, WHICH WAS THE TEMPTING FIX.** A presence
  badge answers whether the thing feeding the picture is ANSWERING. Nothing
  feeds this one: it is a recording of a show that finished, so there is no
  liveness to report and a re-worded badge would be the same lie in a better
  costume. `left: false` is the panel's own way of saying a slot has nothing to
  put in it, and the footer keeps its other two.

- ✅ **STAGE AND THEATRE OUT OF THE ERR ARCHIVES, 2026-09-18.**
  `research/err-stage-theatre-2026-09-18.md`, 498 lines. **161 requests, all to
  the catalogue, NO MEDIA OF ANY KIND**: no manifest, segment, mp3, mp4 or
  thumbnail, and `vod.err.ee` / `heli.err.ee` / `arhiiv-images.err.ee` were never
  contacted. Spaced 1.8 s, every response cached, and the API refused nothing.
  **10,185 rows harvested complete** in the archive's own `Lavastuslik`
  category (5,609 video, 4,576 audio), dated **1928-07-15 to 2026-09-14** over
  84 distinct years, plus 30,243 or more photos, which is a floor because the
  count saturates.
  ⚠️ **IT IS A DOCUMENT AND NOT A `stage.json`, AND THE REASON IS THE FINDING.**
  The rows were harvested and then measured: only **15.7%** say anything about a
  stage, and `content=etendus` finds MORE theatre in `Kultuur` (2,377) than in
  `Lavastuslik` (1,079), because one holds the productions and the other holds
  the writing about them. There is no honest membership rule, so a corpus file
  would have shipped a set already proved wrong. The recipe that regenerates the
  rows in 22 requests is in the document.
  🔴 **AND THE `keywords` PARAMETER IS INERT, WHICH IS A BROKEN COLLECTOR
  CAUGHT BY ITS OWN TIDINESS.** Ten different theatre terms returned exactly
  30,000 / 10,000 / 10,000 / 10,000. Identical numbers from ten different words
  is not a finding, and a year-bounded control proved it. `category` and
  `content` do work.
  ⚠️ **THE METADATA SHAPE HAS MOVED** since `research/err-archives-2026-08.md`:
  `metadata.technical[]` is now `metadata.data[]` with three groups, and
  `makers` is empty on every audio item.

- ✅ **THE ARCHIVE TIMELINE IS THREE TIMES HIGHER, AND IT IS NOT A RULE,
  2026-09-18.** Four messages settled it: *"Make archive timeline 3x higher"*,
  *"Make it a rule"*, *"Ita ok to have empty space in timelime, def min
  height"*, then *"No rule just min height"*. MEASURED at **50 px** before and
  **150 px** after, which is 3x to the pixel, and the floor is `STRIP_MIN_H` in
  `demo/shell/strip.mjs` rather than a number typed on a page.
  ⚠️ **A FLOOR, NEVER A HEIGHT.** Lanes needing more than 150 still get more, so
  a page cannot clip its own content by asking for it, and the empty space under
  the last lane was explicitly accepted rather than packed out.
  ⚠️ **AND IT IS OPT-IN, WHICH THE MEASUREMENT DECIDED BEFORE THE RETRACTION
  DID.** Every `auto` strip in the project was measured first: kit 44, stage 50,
  draw 68, lanes 72, instrument 100, click 104, loops 116. A blanket floor would
  have reshaped all seven, and `/kit/`'s 44 px specimen is 44 px on purpose.
  🔴 **IT ALSO BROKE A CHECK, AND THE CHECK WAS RIGHT TO COMPLAIN.** `/stage/`'s
  "no black rule between the lanes" assert sampled to the bottom of the canvas,
  found the new empty ground under the last lane and reported a drop of 21.
  `timeline/strip.mjs` now keeps `lanesH` (how far down anything was drawn)
  apart from `contentH` (how tall the canvas is); they were one number until a
  floor existed. The check bounds itself to `lanesH` and reads a drop of 0 over
  63 rows, with its three lanes still present so the subject has not gone
  missing.

- ✅ **LOOP AND RATE ARE OFF THE ARCHIVE TRANSPORT, 2026-09-18.** MEASURED: no
  loop button in the bar, 0 rate buttons. It is play and nothing else.
  ⚠️ **THE TWO CAME OFF IN DIFFERENT PLACES AND THAT IS NOT AN INCONSISTENCY.**
  `loop: false` is the bar's own option, beside `scrub: false` and `time:
  false`. The RATES are not the bar's to refuse: they are the intersection of
  every `caps.rates` its deck's kinds declare, and the bar already draws them
  only when that intersection holds more than one value. So the honest way to
  have none is for the DECK to stop claiming four, which is what its adapter now
  says. A `rates: false` option would have put one fact in two places and let
  them disagree.

- ✅ **THE LOG IS OFF `/stage/`'S AUDIENCE TAB, 2026-09-18.** MEASURED: on the
  audience tab the log reads `hidden: true, display: none`; on the archive tab
  it reads `display: grid`. The other two tabs keep it, because they are worked
  by the person running the show, who is who a log is for.
  🔴 **AND `hidden` ALONE DID NOTHING, WHICH IS THE PART WORTH KEEPING.**
  `.pos-log` sets `display: grid`, and ANY author rule beats the browser's own
  `[hidden]`, so setting the property would have left a log on screen and a flag
  that reads as set. `.pos-glue[hidden]` already existed three hundred lines up
  in the same stylesheet for exactly this reason. `.pos-log[hidden]` now does
  too, at (0,2,0) so it cannot lose to `.pos-log`.
  ⚠️ **THE FIRST `go()` IS QUIET, SO `onPick` DOES NOT FIRE ON LOAD.** The page
  opens on the audience tab, so leaving the initial state to the callback would
  have shown the log to exactly the reader it is being taken from until they
  touched a tab. It is applied once by hand.

- ✅ **GLUE IS OUT OF THE DOCS AND THE FOUR REAL ONES ARE GLUED, 2026-09-18.**
  Asked as *"i see no poiint in glue, it looks off and pointless in docs. just
  glue the 4 we have properly"*, and the four were CONFIRMED rather than guessed
  before any of it was written.
  The `/kit/` section is gone, along with its two grey specimen boxes reading
  `a block` and `and another` and the `.kit-glue-demo` rule that styled them. It
  demonstrated the mechanism and none of the reason for it, which is what made
  it read as furniture. `node demo/verify.mjs kit` is **45/45 before and after**,
  so removing it moved no button the harness presses by position.
  The four, each LOOKED AT rather than assumed, because the complaint was
  visual: `/stage/` archive (bar + strip, already done), `/radio/` (bar + scope),
  `/replay/` (bar + strip), `/tapes/` (scope + bar). 52/52, 60/60 and 45/45
  green across them.
  ⚠️ **`/tapes/` IS THE SCOPE AND THE BAR, NOT THE STRIP AND THE BAR.** Its
  strip runs edge to edge past the page margins while the scope and bar are
  inset, so a box round the strip and the bar would have to reconcile two widths
  and put its seam across a block the tape's own picture already crosses.
  ⚠️ **AND `createGlue` PUTS NOTHING ANYWHERE.** It re-parents its blocks into a
  box and hands the box back, so a page that only calls it loses both blocks off
  the page. Every one of these captures its anchor BEFORE the call, because a
  node read after it can already be detached and `insertBefore` throws on that.

- ✅ **THE FIVE BLACK KEYS ARE WHERE A PIANO PUTS THEM, AND THIS LINE OUTLIVED
  THE WORK BY A DAY.** The move landed in `8bdd489` on 2026-09-17 and was never
  struck off. VERIFIED BY MEASUREMENT 2026-09-18 rather than by reading the
  diff: `SHARP_OFF` keys off the PITCH CLASS as §4.1 asked, `--k-off` is
  consumed by `shell.css`, and `/kit/` reports the narrowest white strip at
  **27.0 px, 0.551 of a white key**, against 0.401 when the keys were centred
  and 0.439 in GarageBand. That is the predicted 27.00 to the digit.
  ⚠️ **THE STACKING ASSERT WAS RE-DERIVED TOO, AND BETTER THAN ASKED.** The
  worry was that it sampled symmetrically about the join and so could not see
  the change. What shipped does not measure a centre at all: it measures the
  STRIP a finger lands on between two black keys, which is the quantity the
  offsets exist to change. Its own comment records the old centred-on-join
  assert going red at 7.33 px, so it is a check proved against both states
  rather than against one.

- ✅ **`/stage/` IS BUILT AND THIS LINE OUTLIVED IT BY A DAY.** Every clause of
  the dictated spec is met and MEASURED: three tabs, three panels each showing
  the same generated test picture, `node demo/verify.mjs stage` at **21/21**
  including `three panels, one for each tab` and `the fullscreen button is
  square, 34.0 by 34.0 px`. The sentence that ENDED MID-WAY, *"Make a generic
  component with"*, was answered without being guessed at: it is
  `demo/shell/video-panel.mjs`, with l/c/r slots, `left` defaulting to presence,
  `right` to a square fullscreen button, an empty centre, and `FULL_MODES =
  ['hover', 'footer', 'bare']` covering the two modes the message did describe.
  ⚠️ And `tabs.mjs` finally has its first real use, which the entry correctly
  predicted was the test that component had never had.

- ✅ **THE GMAIL HTML HALF WAS ALREADY FIXED, AND THE REAL FINDING IS THAT
  NOTHING GRADED IT. SETTLED 2026-09-18 BY CAPTURING THE MESSAGE.** The raw of
  both real messages was pulled from the sender's own mailbox and they are now
  fixtures, byte for byte, at 542 and 539 bytes (Gmail's own size estimate for
  each). Run against the SHIPPED `firstText`, the 19:54:32 message returns
  exactly `hello!`. So the room entry was written by the build BEFORE the repair:
  the two messages are two minutes apart, the deploy went out between them, and
  the 19:56 message came out clean and labelled while the 19:54 one did not.
  ✅ **AND THAT IS NO LONGER AN INFERENCE.** `wrangler deployments list` on
  2026-09-18 reports the previous deployment created at **19:55:59.807Z**, which
  falls between the two messages (19:54:32 and 19:56:17). The reasoning from the
  fixtures and the deploy record agree, and they were arrived at independently.
  ⚠️ **THE LESSON WAS THE ONE THE ENTRY PREDICTED, IN A PLACE NOBODY LOOKED.**
  `firstText` lived inside `index.js` beside a `fetch` and a WebSocket, so
  nothing could import it and it had ZERO asserts, while `spam.mjs` next door had
  51. It is `workers/mail/src/body.mjs` now, graded by 8 body fixtures and a
  sweep asserting that no message hands back any part of its own envelope. The
  suite is **75/75**, up from 51.
  ⚠️ AND THREE REAL DEFECTS CAME OUT OF WRITING THE FIXTURES, none of which the
  room had shown: a nested `multipart/mixed` (an attachment) handed the whole
  inner structure back as the person's words, a message with no closing
  delimiter lost its only part to `slice(1, -1)`, and a message whose line
  endings had been normalised to LF matched no `\r\n\r\n` and returned its own
  headers as the body.

- ✅ **A SUBJECT FROM OUTSIDE ENGLISH IS DECODED AND DEPLOYED, 2026-09-18.**
  RFC 2047 in `workers/mail/src/body.mjs`: both encodings, adjacent words joined
  with no space added between them, and charsets that are not UTF-8. Graded on
  the exact string from the entry above this one, `=?utf-8?B?a8O1aWdlIGjDpHN0aQ==?=`,
  which now reads `kõige hästi`.
  ⚠️ **THE BODY WAS BROKEN THE SAME WAY AND THE ENTRY DID NOT SAY SO.** A subject
  is MIME-encoded because the alphabet forced it, and the same message's BODY
  arrives `quoted-printable` or `base64` for the same reason, so decoding only
  the subject would have left `K=C3=B5ige h=C3=A4sti` under a heading that now
  reads correctly. Both halves are decoded and both are fixtures.
  ⚠️ **AND A DECODED HEADER IS FLATTENED TO ONE LINE.** A subject is the first
  line of a note whose other lines are the body, so an encoded word carrying a
  newline could forge a line of our own output. That is the only place in this
  worker where a stranger's text reaches a structured format, and there is an
  assert that plants exactly that and requires it not to work.
  ✅ **DEPLOYED 2026-09-18** as version `50a78731` at 100%. This entry carried a
  red line saying it was in the repo and not on the edge, which was true for
  about an hour and then was not.

- ✅ **THE VERDICT SAYS WHICH SIGNAL DECIDED IT, DEPLOYED 2026-09-18.**
  `auth.via` already held the answer and went only to `console.log`, where nobody
  was looking. It is a chip now: `[ok · via Authentication-Results]` against
  `[ok · via ARC]`, so the four characters that could not tell the two apart have
  become a label that says which. Graded with the negative control that gives it
  meaning: a fixture with a real stamp and one with only a forwarded ARC set must
  come out DIFFERENT, and a message with no stamp at all must name no source
  rather than invent one.
  ⚠️ **IT IS EMITTED ON THE ORDINARY CASE TOO, BREAKING THIS FILE'S OWN RULE
  ABOUT CHIPS ONLY WHERE THEY BEAR ON THE VERDICT, AND THAT IS DELIBERATE.** A
  chip that appears only in the interesting case cannot be told apart from a
  build that does not have the chip yet, which is the identical argument that put
  `[ok]` on ordinary mail to begin with.
  ⚠️ **WHAT IS STILL NOT KNOWN IS WHAT DECIDED THE 19:56 MESSAGE.** That cannot
  be recovered from here: the room holds only the label, and the sender's copy
  carries no `Authentication-Results` because the receiving side adds it. The
  worker's own log for that delivery would answer it and observability is on.
  The next message answers it by itself.

- ✅ **INCOMING EMAIL AT `positron@positron.studio` IS BUILT, DEPLOYED AND
  RECEIVING. THE MOST STALE LINE IN THE FILE.** It said *"nothing is built and
  no DNS or zone setting has been touched"*. `workers/mail/` is a complete Email
  Worker routing mail into the feedback room over the relay, graded **75/75** on
  20 spam fixtures and 8 body fixtures, live as version `50a78731`. The proof it
  receives is elsewhere in this same file: the two real messages that arrived at
  19:54:32 and 19:56:17 on 2026-09-17, which three other entries reason about.
  ⚠️ **AND THE QUESTION THE ENTRY CALLED LOAD-BEARING WAS ANSWERED**, in
  `wrangler.jsonc`'s own header, quoting the ask: *"I just need an email address
  people can contact. That's it. And uh, the agent should be reading it"*. What
  it is for is the feedback room, and that is why there is no second store.

- ✅ **THE TWO VERBS ARE WRITTEN AND NEITHER HAS MET A JACK SERVER
  (2026-09-18).** `jack.graph` reports `jack_lsp -c` as structure, a `pgrep -cx`
  count of the five processes that make the sound, jackd's own command line,
  what the box BELIEVES is running, and the chain it should have against the one
  it has (`want`, `missing`, `extra`, `intact`). `jack.rebuild` patches the
  DIFFERENCE and nothing else. Both answer in their own names, because
  `audio.status` answering `audio.started` cost nine seconds and a false
  conclusion that no board was in the room.
  ⚠️ **THE SHARING DECISION, WRITTEN DOWN IN `rig/board/README.md`:** the board
  cannot see a listener (the relay forwards verbatim, `webSocketClose()` is
  empty, a page holding PCM says nothing), so the rebuild is a diff that runs
  zero commands on a healthy graph, kills no process, says out loud who else is
  in the room when it does cut a link, and refuses on `onlyIfIdle: true`. A
  SERVICE restart is deliberately still not a verb: `audio.stop` then
  `audio.start` already does that, at about thirteen seconds of silence for
  everybody.
  ⚠️ **UNVERIFIED.** No ssh from here, so nothing has been run against real
  `jack_lsp` output. `node rig/board/test.mjs` is 92/92 with 25 new checks on the
  parse and the chain against `fixtures/jack-lsp-c.txt`, and two deliberate
  sabotages take it to 88/92 and 90/92. What is still open: that this board's
  real `jack_lsp -c` parses as the fixture does, and that a real `jack_connect`
  repairs a real drift. Deploy with `rig/board/push.sh` and confirm with the md5s
  it prints, which now cover `jacksynth.mjs` as well as `board.mjs`.
