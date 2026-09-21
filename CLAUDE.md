# positron

Live at **https://positron.studio**. R&D, not a product. 56 demo rows of which
54 are shelled, a Raspberry Pi in another building, a Novation Circuit on the
desk, and a pile of measurements about streaming.

⚠️ **COUNT THE DEMOS, NEVER REMEMBER THEM.** This line said `47 of 49` one
morning and `51 of 53` that afternoon and both were true when written, and both
times it was a background agent reading the stale number that caught it.

```sh
node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"
```

The front page is ordered NEWEST FIRST, because the index answers *what is new
here?*; `DEMOS` is the story order and answers *where do I start?*, and
`byNewest()` copies it. `built: false` hides a row from the index.

## The standing files, and what each one answers

| file | answers |
| --- | --- |
| `HANDOFF.md` | what state this is in right now |
| `BACKLOG.md` | what has been asked for and not yet done |
| `LESSONS.md` | why the rules exist, at length |
| `PROGRESS.md` | what was measured, when |
| `LAYOUT.md` | where a new file goes, and the two renames that were priced and rejected |
| `plans/` | every plan, 62 of them today. A new one goes here and nowhere else |

## The skills, and when to load one

🔴 **THIS FILE USED TO BE 2245 LINES AND IT IS NOW ABOUT A FIFTH OF THAT.**
Everything that left is in `.claude/skills/`, verbatim, and nothing was
summarised away. What stayed here is what is true on every task: the workflow,
the things that cost real money, and the rules about what leaves this machine.

**Load the skill BEFORE the work, not after it.** A rule that is not loaded is
a rule that gets broken, and most of what follows was written down because
somebody broke it.

| load | before |
| --- | --- |
| `positron-ui` | building or changing any interface, control, readout, table, transport bar or stylesheet rule |
| `positron-diagram` | drawing or editing a diagram |
| `positron-verify` | running or changing a harness, adding or removing a control, believing a red run, reporting a measurement or an absence |
| `positron-streaming` | anything under `workers/` or `src/`, any page that plays a stream, quoting a latency or a bill |
| `positron-xr` | any `gl: true` or headset page, `verify-gl.mjs`, `verify-quest.mjs`, full screen on a phone |
| `positron-hardware` | anything under `rig/`, a page that plays real hardware, any claim about an instrument |
| `positron-history` | following a link, slug or path out of an older file, or repeating a claim about a rename |

⚠️ **AND THE TRIGGER IS THE WORK, NOT THE FILE.** Adding one button to a page
is a `positron-ui` task AND a `positron-verify` task, because adding a control
moves every other control's harness press. When two apply, load both.

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

## `New Pack.circuitpack` IS SOMEBODY'S ONLY COPY. DO NOT DELETE IT

🔴 **A 3.3 MiB FILE IN THE REPOSITORY ROOT THAT IS NOT BUILD OUTPUT AND IS NOT
A MISTAKE.** A complete backup of the Novation Circuit on this desk, taken
2026-09-20 through Novation Components, and asked to live here: *"put
.circuitpack to project root"*.
🔴 **THE CIRCUIT HAS NO FACTORY RESET AND THEREFORE NO UNDO.** Three things
replace its contents and all three are one press from the safe one: `Send to
Circuit`, loading the Circuit Factory Pack, and a `Replace Patch` SysEx. If any
of them is used and this file is gone, the work is gone.
✅ **IT IS VERIFIED, NOT ASSUMED.** A `.circuitpack` is a zip. This one holds
**164 files**: 32 sessions, 64 patches, 64 samples, and an `index.json` reading
`product: circuit, version: 2.0`. `patch_0.syx` is exactly **350 bytes**
starting `F0 00 20 29 01 60`.
🔴 **AND ALL 32 SESSIONS ARE REAL WORK, WHICH WAS CHECKED AFTER GETTING IT
WRONG.** The first reading treated the NAMES as the evidence and implied the
ones still called `User Session` might be blanks. **They are not**, and the
owner said so: *"user sessions are mine. very important"*. MEASURED: **32
distinct fingerprints of 32**, not one a copy of another, **zero sessions
entirely empty**, every one 84 to 89 per cent non-zero bytes, and the `User
Session` rows sitting HIGHER than most of the named ones. **A name is a label
somebody did not change. Content is the fact.**
⚠️ **VERIFYING A BACKUP NEEDS NO DEVICE**: `unzip -l`, read `index.json`, check
the session count, check one patch is 350 bytes. Fewer WAVs than sample rows is
normal rather than damage. `plans/plan-circuit-patches.md` has the whole
procedure and the list of what destroys patches.

🔴 **AND SINCE 2026-09-21 THERE ARE THREE PACKS ON THIS MACHINE THAT ALL DISPLAY
AS `*New Pack`, AND TWO OF THEM WOULD ERASE THE SESSIONS.** A purchased
soundbank in `purchased/` carries two `.circuitpack` files whose 32 session
files are **blanks**, measured rather than inferred from their names: **1
distinct fingerprint of 32**, entropy **0.01 bits a byte**, **0.1 per cent
non-zero**, and an empty `name` in all 32. The owner's own pack is 32 distinct
of 32 with none empty.
🔴 **AND THE FIRST FOUR BYTES ARE NOT A FOURTH TEST. THIS LINE SAID `INIT`
AGAINST THE OWNER'S `DEMO` UNTIL 2026-09-21, AND THE PACK SAYS OTHERWISE.**
MEASURED on both sides that day while building `/pack/`: the owner's 32
sessions are **`USER` 22, `DEMO` 7 and `INIT` 3**. Three of somebody's real
sessions carry the exact head published here as the blank signature, and all
three are ordinary work at entropy 0.87 and 86.5 per cent non-zero with distinct
fingerprints. **Deciding on the head would have condemned them.** The three
numbers above separate the two packs by two orders of magnitude and are what the
check rests on. ⚠️ It is the `User Session` mistake one layer down, in a field
that looks like content rather than like a label.
🔴 **THE VENDOR'S INSTALL NOTE SAYS TO PRESS `Send to Circuit`**, which is one
of the three operations listed above that replace the instrument's contents on a
box with no factory reset. So the safe pack and the two that would wipe 32
real sessions are three identically labelled rows in Components.
⚠️ **READ THE `name` IN `index.json` BEFORE SENDING ANYTHING**, because the file
name and the displayed name are both `New Pack` and neither tells them apart.
⚠️ Whether that transfer really writes session slots is INFERENCE and is marked
as such in `research/circuit-soundbank-2026-09-21.md`. The only way to confirm
it costs the sessions if the answer is yes.
✅ **THE 128 LOOSE `.syx` FILES ARE SAFE**: byte 6 is `00` on every one, which is
`Replace Current Patch` and lands in RAM. Not one flash-writing `Replace Patch`
exists in the archive.

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

## What costs real money and somebody else's server

🔴 **EVERY CONNECTION THIS REPOSITORY OPENS TO AN ERR MOUNT APPEARS IN A PUBLIC
BROADCASTER'S AUDIENCE MEASUREMENT.** Said by ERR on 2026-09-16 and relayed:
*"ERRil oli ka probleem, et nende kuulajastatistika läheb sassi"*. Their
LISTENER STATISTICS were being corrupted by us, which is worse than load: a
broadcaster's audience figures are what it reports to its board and its
funders, and a few dozen headless Chromes holding mounts open for hours are
counted as listeners who never leave. It cannot be undone by stopping, only by
not adding to it. **So open one only when a person is going to listen to it.**

🔴 **AND IT IS NOT ONLY ERR. EVERY EXTERNAL SOURCE.** Instructed the same day:
*"stil: super careful with external sources, better avoid"*, in reply to
*"it uses archive.org, not ERR, so it is safe to run"*. That reasoning was the
mistake. **The rule is about whose server it is, not about which harm has been
named yet.**

🔴 **DO NOT RE-VERIFY `/radio/` OR PROBE STATION HEALTH. ASKED TWICE**, the
second time as *"can we please stop assessing the radio, its killing me and my
budget"*. Never `curl` a mount, a health route or a live segment to find out
whether somebody else's server is up. The answer to *is it red because of me or
because of them* is: **say both are possible and move on.**

✅ **FOUR PAGES HAVE STAND-INS AND COST NOBODY ANYTHING**: `demo/fake-station.mjs`,
`demo/fake-tapes.mjs` and `demo/fake-err.mjs` make `radio`, `tapes`, `now` and
`flipper` runnable with zero bytes from anybody's server. They grade OUR code
and nothing else, they are verified LOCALLY and never with `DEMO_BASE`, and a
page green against one can still meet a 403 out there. `positron-verify` has
all of it, including the holes each one leaves and how they were found.

🔴 **A SELF-CHECK NEVER RUNS FOR A VISITOR. NOT ONE, NOT EVER, ON ANY PAGE.**
Instructed 2026-09-16: *"rip those selfchecks out of user experience and make
rule about it"*. Import `SELFCHECK` from `demo/shell/selfcheck.mjs`; the gate is
`?selfcheck=1`, which the harnesses append and **the default is off**. There is
no page that is an exception, *"nobody is holding this one"* is not an
exception, and *"it is cheap here"* is not an exception either. Both arguments
were tried, both shipped a defect, and `positron-verify` has the two stories.

🔴 **AND THE WORST SHAPE IS A PAGE THAT OPENS SOMETHING ON LOAD.** `/reel/`
fetched a newsreel and a day's radio on **every visit** for a first frame nobody
had asked to see. A visit, a step and a scrub must open nothing.

## How a session is run

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

🔴 **A STANDING FILE GOES STALE IN HOURS ON A BUSY DAY, AND A BACKGROUND AGENT
READING IT INHERITS THE ERROR AS A FINDING.** Both of this session's stale lines
were caught by agents, not by anybody looking: `tabs.mjs` reported as used by no
page while two pages use it, and the demo count at the top of this file wrong
**twice in one day**, `47 of 49` in the morning and `51 of 53` by the afternoon,
both true when written. ⚠️ **SO A CLAIM AN AGENT IS GOING TO BUILD ON IS WORTH
ONE COMMAND OF CHECKING BEFORE IT IS HANDED OVER**, and a brief should say which
claims in it were verified today.

## One shared resource with everything around it partitioned

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

## Conventions

- 🔴 **A FINISHED PLAN IS REPORTED IN FULL, NOT HANDED OVER AS A FILENAME.**
  Instructed 2026-09-20: *"when plans done show them here in full details.
  write it into claude.md when plans getting ready"*. It is the same rule as
  the URL one below, one document along: `plans/plan-midi2.md` is the answer to
  *"which file did you write"* and not to *"what did you find out"*.
  ⚠️ **AND A SUMMARY IS NOT THE REPORT EITHER.** What a plan is FOR is the
  findings, the numbers, the trade-offs and the recommendation with its reasons.
  A reader who has to open the file to learn what was decided was handed a
  filename with extra steps. Say what it concluded, what it measured, what it
  refused and why, and what it could not settle.
  ⚠️ **THE UNCERTAINTY IS PART OF THE REPORT, NOT A FOOTNOTE.** This project
  keeps paying for confident sentences that outlived their facts. A plan written
  from documentation rather than from a running thing says so, and names what
  would have to be plugged in, switched on or measured to turn a reading into a
  fact.
  🔴 **AND THEY LIVE IN `plans/` SINCE 2026-09-20, NOT IN THE REPOSITORY
  ROOT.** Instructed: *"move plans to plans dir"*. **58 documents**, several over
  1000 lines, moved with `git mv` so the history follows them. A new plan goes
  in `plans/` and nowhere else.
  ⚠️ **129 FILES REFERENCED ONE BY NAME AND EVERY ONE WAS REWRITTEN**, because a
  path in a comment that no longer resolves is this project's most repeated
  defect in its cheapest form. `archive/` was deliberately LEFT ALONE: an
  archive records what was there, the same rule that keeps `box` and
  `radio1965` spelled the old way inside it.
  ⚠️ A plan nobody reads is a plan that gets rewritten by the next person who
  needs it. Reporting it in full when it is fresh is the only moment it is
  cheap.

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

## Writing a skill, or moving a rule into one

A rule earns a place in THIS file only if it is true on every task. Everything
else belongs in a skill, and the skill is named for the WORK rather than for the
code: somebody about to change a control has to recognise `positron-ui` from
what they are about to do.

- 🔴 **MOVE A RULE VERBATIM. DO NOT SUMMARISE IT.** The measurements, the dates,
  the quoted reports and the wrong first answers are the reason a rule survives
  being argued with. A condensed rule reads as an opinion.
- ⚠️ **AND WHEN A RULE MOVES, LEAVE ITS TRIGGER BEHIND**, which is the row in the
  table above. A rule nobody knows to load is a rule that is gone.
