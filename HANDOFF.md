# Handoff, 2026-09-21, session 40

**Thirty-seven commits, deployed three times, and the day was one long stream of
reports off the deployed pages.** Collected in `BACKLOG.md` as they arrived and
worked in fanned-out batches, which is the arrangement the standing rule asks
for and it held for about forty requests.

🔴 **READ THIS FIRST, AND IT IS THE THIRD SESSION RUNNING: `origin/main` STILL
NEEDS ONE COMMAND FROM A PERSON.** It points at **`4add323`**, whose message is
about a Circuit pack and whose content is 57 plan renames with zero insertions
and zero deletions. The force push is blocked from here.

```sh
gh auth switch --user kristjanjansen
git push --force-with-lease=main:4add3238cd812195db75fddfe405786fe5359a8b origin 6a8befc:main
gh auth switch --user Kristjan-Jansen_enefit
```

⚠️ **ONE AGENT WAS STILL RUNNING WHEN THIS WAS WRITTEN**, rig-testing the
similar-sounding name lookups in `demo/shell/instruments.mjs` against what the
REAL speech models return, with several `say` voices and about forty
instructions including a dozen that name no instrument. It writes
`research/name-lookups-2026-09-21.md` and may tune `instruments.mjs` and its
test. **If that file is dirty or that research file exists, its work landed and
was not committed by session 40.** Read its document before touching the
matcher, because its whole job was to replace invented test cases with measured
ones.

✅ **EVERYTHING ELSE IS COMMITTED AND THE TREE WAS CLEAN.** Every commit was
path limited, because up to five agents were writing in this checkout at once.

## Deployed, and what to open

Both deploys today were built from a **throwaway `git worktree` at `HEAD`**
rather than from the working tree, because agents were mid-edit and a build here
would have shipped half-finished pages. Worth keeping as a technique:
`git worktree add --detach`, build and deploy from there, remove it. The
worktree has no `.env`, so wrangler uses the machine OAuth session and the
`.env` trap does not arise.

- **https://positron.studio/** the front page, `hardware` group first
- **https://positron.studio/bay/** the patch bay. **Patch it by PLAYING two
  instruments**, and it has a `panic`
- **https://positron.studio/evo/** the Evolution MK-425C, rebuilt from photographs
- **https://positron.studio/shape/** the Circuit editor, and **it has been heard**
- **https://positron.studio/kit/** six tabs, and a `PANEL` specimen
- **https://positron.studio/model/** and **/circuit/** with their nameplates
- ⚠️ **https://positron.studio/wish/** answers 200 and **cannot work deployed**:
  its agent is `node demo/wish-local.mjs` on this laptop. Locally it is
  **http://127.0.0.1:8890/wish/**, with the agent on **:8799**.

🔴 **AND A RUNNING NODE PROCESS WAS THE REASON A FIX LOOKED ABSENT, TWICE IN ONE
DAY.** `wish-local.mjs` imports `workers/wish/src/wish.mjs` ONCE at startup, so
after any change to that module it serves the old one and *"still broken"* and
*"the fix never loaded"* are the same observation. Once it was the transpose
repair, once the `PATCH` rename. **Restart it before diagnosing anything about
that page**, and it deserves a build stamp on boot or a per-request reload.

## The one thing that changes what this project is

🔴 **THE CIRCUIT HAS BEEN PLAYED FROM A COMPUTER. `/shape/` WORKS.** Reported as
*"shape works"*. That was `HANDOFF.md`'s priority 3 for two sessions and the one
claim this repository could never grade by itself. `portSends === 0` is still
asserted, because what changed is that a PERSON pressed it and a suite run still
may never be a hand on somebody's instrument.
⚠️ **`/bay/` IS STILL UNHEARD**: routing the MK-425C INTO the Circuit through the
patch bay is a different path and nobody has played it.
❓ **AND WHICH OF THE FIVE BADGE WORDS IT TURNED OUT TO BE IS NOT RECORDED.**
`refused` would mean the MIDI permission prompt was the whole story, `no match`
the port name, `sending` all along something else. Worth asking before it goes
stale.

## `CLAUDE.md` is 436 lines and seven skills

2245 lines and 157 KB became 436 and 27.6 KB, **an 82 per cent cut to what every
session and every agent pays on every turn**, roughly 39,000 tokens down to
6,900. Seven skills in `.claude/skills/`: `positron-ui`, `positron-verify`,
`positron-diagram`, `positron-streaming`, `positron-xr`, `positron-hardware`,
`positron-history`.

✅ **NOTHING WAS SUMMARISED AWAY AND IT WAS PROVED RATHER THAN CLAIMED**: all
2146 non-blank lines matched verbatim against the new file plus the seven skills,
with only four restructured headings unmatched. The partition refuses to claim a
line twice, so no rule was duplicated either.
🔴 **THE RULE THAT CAME OUT OF IT IS IN `LAYOUT.md`**: a rule stays in
`CLAUDE.md` only if it is true on every task, a skill is named for the WORK
rather than the code, a rule moves VERBATIM because the measurements and the
wrong first answers are what make it survive being argued with, and **when a
rule moves its trigger stays behind** as a row in the table. A rule nobody knows
to load is a rule that is gone.

## What was built today, beyond the reports

- 🔴 **`/bay/` IS PATCHED BY PLAYING THE INSTRUMENTS**, which is what was asked
  four times before it was understood. Every earlier answer made the SCREEN
  easier to press: the `connect` button went, then the rows became instruments
  rather than ports. Both were real improvements to the wrong thing. **A gesture
  is a note on and nothing else**, because the Circuit sends its own clock
  continuously at about 122 bpm and *the last instrument that sent anything*
  would pick it within a millisecond and never let go. It also has a **`panic`**
  now (CC 123 then CC 120, all 16 channels, every output) because stuck notes
  arrived the minute MIDI started flowing.
- 🔴 **AND A LOOPBACK HIJACKED IT WITHIN A MINUTE, WHICH ONLY THE REAL DESK
  COULD FIND.** `IAC Driver Bus 1` returns everything sent to it, so panic's 32
  control changes came back on its input and the bay linked the keyboard to the
  bus. It looked exactly like the feature working. Three repairs: a controller
  is no longer a gesture, a port is deaf for 250 ms after this page sends to it,
  and a loopback **keeps its row** but is pressed rather than played.
- **`demo/shell/instruments.mjs`, the desk's taxonomy**, 23 asserts. Built
  because `/wish/` was told *"connect evolution to circuit"* and correctly
  answered that nothing on this desk is called evolution: CoreMIDI calls that
  port `MK-425C USB MIDI Keyboard` and the maker was in NONE of the strings
  anything had. It is **data, never a derivation**, and an unrecognised port
  gets no invented brand.
- **`demo/shell/panel-layout.mjs`**, extracted from three hand-rolled panels,
  **and no selector moved**: every element carries its instrument class beside
  the shared one, so `/model/`'s 19 at-risk rules are untouched.
- **`demo/shell/segment.mjs`**, a segment display drawn from parts, 34 asserts,
  two schemes whose inversion is asserted by LUMINANCE rather than by hex.
- **`/kit/` is six tabs** and the newest block marks its own tab with nothing
  typed: it is the first `section()` call in the file, so when the segment
  display moved tabs the mark followed with no edit.

## The defects worth carrying forward

🔴 **EVERY STATE COLOUR ON THE PRESENCE BADGE WAS DEAD, ON EVERY INSTRUMENT
PAGE.** `.pos-presence-btn .pos-pres { color: inherit }` is (0,2,0) exactly like
`.pos-pres[data-state="online"]` and sat 750 lines later, so it won on source
order and the badge computed `--fg` in ALL FIVE states. The dot is
`background: currentColor`, so an ONLINE instrument had a near-white dot rather
than a green one. Asserted as ink now, because a grep for that rule would have
found it present and correct on every day it was broken.

🔴 **A DELETED `const` TOOK SEVENTEEN ASSERTS SILENT AND THE SUITE READ GREEN AT
16/16.** Mine, on `/wish/`. They did not fail, they stopped running, and the
only thing that said so was `page asserted something · 10` where it had been 27.
**The count is the rule.**

🔴 **A `min-height` I ADDED NEVER APPLIED, FOR HOURS, WHILE READING AS
CORRECT.** `/wish/`'s picture was meant to reserve its room so an answer could
not shove the log down the page. Measured: the empty host was **0 px and
`display: none`**, beaten by `.pos-stack > div:empty { display: none }` at
(0,2,1). So the log moved on every answer. **Point a browser at it and measure
the computed value** is now the fifth time that sentence has paid for itself.

🔴 **MY OWN BRIEF WAS PROTECTING A BUG ON `/evo/`.** I told an agent not to
touch the key pattern because `createKeyboard` decides colour from the offset
from base. **It does not**: it tests `sharps.has(k)` against a set of computer
key letters, and that page passed synthetic names. Measured: **25 white keys, 0
black**. And `.evo-keys .kbd .pad` was a dead selector because the class is
`.kpad`, so the kit's own octave pair had been rendering on that replica all
along.

🔴 **AND ONE BRIEF OF MINE HAD THE WRONG PREMISE ENTIRELY.** I asked for the
kit's disabled pad labels to be dimmed further. Measured, they were **1.96:1,
the faintest text on the panel**; the loud ones were `/evo/`'s own page-drawn
names at **5.91:1**, which bypass the pad component because they are wider than
the buttons. Doing what I asked would have hidden the faintest text and left
every bright one alone.

⚠️ **TWO ASSERTS WERE GREEN WHILE BROKEN AND ONLY SABOTAGE SAID SO**, both on
`/evo/`: the rotary-order check compared the DOM against the constant that built
it, and the wheels-are-centred check measured the full-width wrapper, which
cannot move.

## Planned and not built: `/patches/` and a drop target

`plans/plan-patches-page.md`, 128 lines, written 2026-09-21 on instruction
(*"do lightweight planning on patch demo (inclu global dragdroppable upload)"*).
Lightweight on purpose: everything hard is already measured and named, so what
is missing is one page and one kit module.

**Asked for after the question "where is patch analuzer / unpacker?", and the
honest answer was: the unpacker exists, the analysis exists as research, and
there is no page.** `demo/shell/unzip.mjs` reads a `.circuitpack` in a browser
with nothing vendored at 13 asserts; `research/circuit-soundbank-2026-09-21.md`
is the 514-line analysis; `plans/plan-circuit-editor.md` has the format byte
for byte. Nothing puts any of it on screen.

🔴 **THE DECODER IS THE ONE THING THAT EXISTED AND WAS NOT KEPT.** The soundbank
analysis built one, graded it against the published `patch_0` at 246 varying
fields of 324 exactly, and it lived in a scratchpad that is gone. Step one is
`demo/shell/circuit-patch.mjs` with its own no-browser test, or the page becomes
the third place that knows the format.

🔴 **AND THE FEATURE THAT EARNS THE PAGE IS A SAFETY CHECK.** It prints, per
session, the distinct fingerprints, the entropy, the non-zero share and the
first four bytes. Those four cheap numbers separate a backup from a wipe: the
purchased pack's 32 sessions measured **1 distinct fingerprint of 32, entropy
0.01, 0.1 per cent non-zero, first bytes `INIT`** against the owner's **32 of
32, 0.83 to 1.46, 84.6 to 89.6 per cent, `DEMO`**. All three packs display as
`*New Pack` in Components, so the only backup of the instrument and the two that
would erase it are three identical rows, and this page is what tells them apart
before anybody presses `Send to Circuit`.

🔴 **THE DROP TARGET IS `open`, NEVER `upload`.** `demo/shell/drop.mjs`, a kit
module. Nothing leaves the machine: `FileReader` to an `ArrayBuffer` in the tab,
no `fetch`. A purchased soundbank lives in `purchased/` precisely because it is
not ours to publish, and a control called *upload* invites somebody to build the
thing the gitignore exists to prevent.
⚠️ Four of its five traps are already measured elsewhere here: `dragleave` fires
on every child so a boolean flickers; `preventDefault` is needed on BOTH
`dragover` and `drop` or the browser navigates to the file and the page is gone;
a fixed full-page cover sits over the controls, which is the `/weight/` and
`/floor/` lesson; and a drop target that is the only way in is a page somebody
cannot use, so there is an `<input type="file">` behind a button on the same
handler.

⚠️ **AND `/patches/` SENDS NOTHING. NOT ONE BYTE.** No Web MIDI at all, asserted,
because a page that could send a pack is one press from destroying flash on an
instrument with no factory reset, and `New Pack.circuitpack` is the only backup
of that flash. `/shape/`'s wall is the model, except that here the function that
turns an intention into bytes does not exist.

⚠️ Order matters and the page is third: the decoder, then the shared drop module
with its `/kit/` block, then the page, then the fingerprint panel. Anything
shared lands before the page that wants it, which is the standing rule.

## What is open

1. **`origin/main`**, above. The only thing here needing a person rather than a
   decision.
2. ⚠️ **THE NAME-LOOKUP RIG TEST WAS STILL RUNNING.** See the note at the top:
   if `demo/shell/instruments.mjs` is dirty or
   `research/name-lookups-2026-09-21.md` exists, read that document first. Its
   job was to replace invented test cases with what the real speech models
   actually return, so anything it says outranks the calibration in the module.
3. 🔴 **`purchased/` IS GITIGNORED WHOLE AND MUST STAY THAT WAY.** *"i purchased
   them. do not git them"*. `New Pack.circuitpack` in the root is the opposite
   case and stays tracked: the owner's own backup, somebody's only copy, and
   `CLAUDE.md` now records that a purchased pack in `purchased/` holds **32
   blank sessions** and that all three packs display as `*New Pack`.
4. 🔴 **`/patches/` AND `demo/shell/drop.mjs`**, planned and not built. See the
   section above and `plans/plan-patches-page.md`. Step one is rebuilding the
   patch decoder as a kept module, because the one that existed lived in a
   scratchpad and is gone.
5. **The remaining `/evo/` and `/shape/` asks in `BACKLOG.md`**, collected and
   not worked: a smaller round pad for the octave `+`/`-`, the keys starting on
   C3, wider keys, `connected` / `not connected` on the instrument pages with
   `unknown` reading the same, and two columns of sliders on `/shape/`.
   ⚠️ **THE C3 ONE HAS AN INSTRUMENT HALF AND A PAGE HALF.** Power-cycle the
   keyboard first: the manual's non-volatile list does NOT include transpose, so
   a power cycle may be the whole answer. And the page fix is not `48`, it is to
   stop hard-coding one measurement of a mutable front-panel setting.
6. 🔴 **`/bay/` STILL SHOWS `here:` PORT IDS IN ITS LINK LINE**, and the shared
   fix is unavailable: `bay-test.mjs` asserts `printLink`'s round trip, so a
   version printing labels would make the text form say what the graph cannot.
   `/wish/` solved it with a page-level human form that reuses `printLink` for
   the transform half. `/bay/` needs the same decision.
7. **The `use "by"` repair press on `/wish/`** is no longer needed the way it
   was: `relabel()` now repairs the key at the boundary and reports it in words.
   What is still open is whether a person should be offered the press instead.
8. **`vad_filter` is unmeasured.** There is no recording of a studio microphone
   with a synth running, so *"the older two may transcribe the room"* remains an
   argument from the API surface.
9. 🔴 **NO PAGE IS GRADED ON A PHONE AND THIS IS NOW THE LARGEST BLIND SPOT.**
   `verify.mjs` runs at 756 px only. Every width number in today's work came
   from throwaway probes, and one of them found a live false assert: `/circuit/`
   claims its panel box starts and ends where the page does, and **at 390 px its
   right edge is 286 px past the page**. Three unpriced options are in
   `plans/plan-panel-component.md`.
10. **The 32 user sessions off the Circuit**, asked for three sessions ago and
    still the missing part of the backup.
11. ⚠️ **TWO THINGS THE PANEL EXTRACTION WANTED IN `shell.css` AND COULD NOT
    HAVE**, both worth deciding once: a shared class for a text surface that
    says it is waiting (`/wish/` now carries a page-local copy of the button's
    sweep, and the next page will copy it again), and an opt-out from
    `.pos-stack > div:empty { display: none }` for a wrapper that is empty on
    purpose with a measured default height. The second is currently won by
    source order, which breaks silently if a page's CSS ever loads first.
