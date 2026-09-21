# Handoff, 2026-09-21, session 40

**Nineteen commits, deployed twice, and `CLAUDE.md` is a fifth of the size it
was this morning.** The day was one long stream of reports off the deployed
pages, collected in `BACKLOG.md` as they arrived and worked in fanned-out
batches, which is the arrangement the standing rule asks for and it held.

🔴 **READ THIS FIRST, AND IT IS THE THIRD SESSION RUNNING: `origin/main` STILL
NEEDS ONE COMMAND FROM A PERSON.** It points at **`4add323`**, a commit whose
message is about a Circuit pack and whose content is 57 plan renames with zero
insertions and zero deletions. The force push is blocked from here.

```sh
gh auth switch --user kristjanjansen
git push --force-with-lease=main:4add3238cd812195db75fddfe405786fe5359a8b origin 6a8befc:main
gh auth switch --user Kristjan-Jansen_enefit
```

✅ **THE TREE IS CLEAN AND EVERYTHING BELOW IS COMMITTED**, on
`session-28-station-videoradio`, none pushed. Every commit was path limited,
because up to five agents were writing in this checkout at once.

## Deployed, and what to open

**BUILD `598a558-080052-7533`.** Both deploys today were built from a
**throwaway `git worktree` at `HEAD`** rather than from the working tree,
because agents were mid-edit and a build here would have shipped half-finished
pages. That is worth repeating as a technique: `git worktree add --detach`, build
and deploy from there, remove it. The tree has no `.env`, so wrangler uses the
machine OAuth session and the `.env` trap does not arise.

- **https://positron.studio/** the front page, with a new `hardware` group first
- **https://positron.studio/evo/** the Evolution MK-425C, rebuilt from photographs
- **https://positron.studio/bay/** the patch bay, one row per instrument
- **https://positron.studio/shape/** the Circuit editor, and **it has been heard**
- **https://positron.studio/kit/** six tabs
- **https://positron.studio/circuit/** and **/model/** with their nameplates
- ⚠️ **https://positron.studio/wish/** answers 200 and **cannot work deployed**:
  its agent is `node demo/wish-local.mjs` on this laptop. Locally it is
  **http://127.0.0.1:8890/wish/?api=http://127.0.0.1:8799**.

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

## The defects worth carrying forward

🔴 **EVERY STATE COLOUR ON THE PRESENCE BADGE WAS DEAD, ON EVERY INSTRUMENT
PAGE.** Reported as *"chircuit checking should be gray"*. It was not, and the
badge computed `--fg` in **all five states**, because
`.pos-presence-btn .pos-pres { color: inherit }` is (0,2,0) exactly like
`.pos-pres[data-state="checking"]` and sat 750 lines later in the file. The dot
is `background: currentColor`, so an ONLINE instrument had a **white** dot rather
than a green one. Asserted as ink now, because a grep for that rule would have
found it present and correct on every day it was broken.

🔴 **A DELETED `const` TOOK SEVENTEEN ASSERTS SILENT AND THE SUITE READ GREEN AT
16/16.** Mine, on `/wish/`. Two surviving references to a hoisted constant made
the check handler throw partway through; the asserts did not fail, they stopped
running, and the only thing that said so was `page asserted something · 10`
where it had been 27. **The count is the rule.**

🔴 **`/evo/`'S KEYBOARD HAD 25 WHITE KEYS AND NO BLACK ONES, AND MY OWN BRIEF WAS
PROTECTING THE BUG.** I told the agent not to touch the key pattern because
`createKeyboard` decides colour from the offset from base. **It does not**: it
tests `sharps.has(k)` against a set of computer key letters, and that page passes
synthetic names in no set.

🔴 **`.evo-keys .kbd .pad` WAS A DEAD SELECTOR** because the class is `.kpad`, so
the kit's own octave pair and a `Notes off` button had been rendering on that
replica all along. Sixth measured dead rule here.

🔴 **TWO ASSERTS WERE GREEN WHILE BROKEN AND ONLY SABOTAGE SAID SO.** `the eight
rotaries read C1 to C8` passed with the constant REVERSED, because it compared
the DOM against the thing that built it. `the wheels are centred` passed with
centring OFF, because it measured the full-width wrapper, which cannot move.

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
2. **Two agents were still running when this was written**: eight `/evo/`
   items (space above the keyboard, `PITCHBEND` as one word, disabled labels
   much lighter, display back to backlit, plain cursor on disabled controls,
   much less blue in the display, the sticky column's border full height, and
   the readout removed), and an analysis of a purchased Circuit soundbank in
   `purchased/`.
3. 🔴 **`purchased/` IS GITIGNORED WHOLE AND MUST STAY THAT WAY.** *"i purchased
   them. do not git them"*. `New Pack.circuitpack` in the root is the opposite
   case and stays tracked: the owner's own backup, somebody's only copy.
4. **THE PANEL LAYOUT IS THE NEXT REAL PIECE OF WORK, AND IT IS READY.**
   `/evo/` was written FOR extraction and not extracted, on purpose: eleven
   role-named `.pan-*` classes with the contract in five numbered points, and
   everything `.evo-*` left behind. There are now FOUR hand-rolled panels
   (`/model/`, `/circuit/`, `/evo/`, and `/keys/`-adjacent), which is the
   standing rule about a component nobody has noticed yet, three times over.
   ⚠️ The one forced decision: `.pan-flow`'s `height: 100%` with a growing
   child, because a kit key is 74 px and a kit pad 46 px while the real ratio is
   15:1, a mismatch neither `/circuit/` nor `/model/` hit because neither has a
   keyboard. Any component has to say which child absorbs the slack.
5. **`/bay/` still shows `here:` port ids.** The shared `printLink` fix is
   unavailable: `bay-test.mjs` asserts its round trip, so a version printing
   labels would make the text form say what the graph cannot.
6. **The `use "by"` repair press on `/wish/`**, recommended and deliberately
   deferred: it means dynamic controls outside `.pos-controls`, which the harness
   does not press and which therefore need their own reachable checks.
7. **`vad_filter` is unmeasured.** There is no recording of a studio microphone
   with a synth running, so *"the older two may transcribe the room"* is an
   argument from the API surface rather than a measurement.
8. **No page is graded on a phone.** `verify.mjs` runs at 756 px only. Every
   width number in today's reports came from a throwaway script, not the suite.
9. **The 32 user sessions off the Circuit**, asked for two sessions ago and
   still the missing part of the backup.
