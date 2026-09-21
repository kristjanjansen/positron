---
name: positron-history
description: What positron used to be called and where the retired pages went. Load before following a link, a slug or a path from an older file, before repeating a claim about a rename, or when a reference in a comment does not resolve.
---

# What moved, what was renamed, and what is gone

Every entry here was an instruction, and each one cost a sweep across the
checkout. `archive/` is deliberately left spelling things the old way, because
an archive records what was there.

# positron

Live at **https://positron.studio**. 54 shelled demos of 56 rows
(2026-09-21, counted from `DEMOS` rather than remembered). **Five arrived on
2026-09-21**: `evo`, `bay`, `wish`, `shape` and `circuit`.
⚠️ **THIS READ `47 of 49` IN THE MORNING AND `51 of 53` BY THE AFTERNOON, AND
BOTH WERE TRUE WHEN WRITTEN.** The second one was corrected three demos before
this one, which is the point: on a day when pages are being added this line goes
stale in hours, and it was a background agent reading it that caught it the
second time. The count is one command and it is written out below. `making` is the MIMproject archive: the
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
