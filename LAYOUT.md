# LAYOUT — where things go, and why

Read this before adding a file. It is short on purpose.

The system already exists; what was missing is that nobody had written it down,
which is why the repo *feels* untidy when it is mostly consistent. Two things
look wrong and are deliberate, and they are named at the bottom with the
measured price of "fixing" them, so nobody re-litigates it from scratch.

---

## The one rule

**A top-level directory says WHO RUNS IT, not what it is about.**

| | runs on | holds |
|---|---|---|
| `demo/` | **a browser** | the demo pages, the shared browser library (`shell/`), the harnesses that drive them, and the dev server |
| `rig/` | **hardware we own** | the Raspberry Pi (`board/`), its renderer (`vis/`), the studio Mac (`m1/`), tools that talk to them |
| `workers/` | **Cloudflare** | `relay`, `view`, `pub`, `backlog`, `ingest` — one directory each |
| `timeline/` | **anywhere** | the library: decks, scores, the strip. Imported by pages and by node |
| `src/` | **a shell** | the publisher and its stream tooling |
| `proto/` | **a browser** | prototypes that are not shelled and are not in the story |

That accounts for everything that executes. What remains is writing:

| | |
|---|---|
| `plans/` | **72** documents that PROPOSE and argue. They moved out of the root on 2026-09-20 on instruction, with `git mv`, and 129 files referencing one by name were rewritten |
| `research/` | **59** documents that REPORT what is out there or what was measured. Two of them arrived from the root on 2026-09-24 and the section below says which |
| `results/`, `studio/`, `archive/` | measurements and captures, mostly untracked |
| `evals/` | scenario cases for the skills, in the layout `claude plugin eval` expects. Its README carries the four rules that make one tell the truth |
| `CLAUDE.md` `LESSONS.md` `PROGRESS.md` `HANDOFF.md` `BACKLOG.md` `LAYOUT.md` `SUMMARY.md` | the standing rules, why they exist, what was measured when, what is asked for, where a file goes, and where we are. They stay at the root and the next section says why |

⚠️ **Counts measured 2026-09-24**, not remembered. `ls plans/*.md | wc -l` and
`ls research/*.md | wc -l` are the only honest source for those two numbers, and
this file has carried a stale pair before.

---

## The root `.md` files, and the two that left on 2026-09-24

🔴 **THE REPOSITORY WENT PUBLIC ON 2026-09-24, WHICH CHANGED WHO THE TOP LEVEL
IS WRITTEN FOR.** Twelve `.md` files sat there, and a stranger cannot tell the
front door from a working file. Two of the twelve were in the wrong place by
this file's own rule 5 and moved. **Ten stayed, and staying was a decision
rather than an omission.**

**The front door, and it is the whole reason the rest can look busy:**
`README.md`, `AGENTS.md`, `LICENSE`, `NOTICE.md`, `CLAUDE.md`. A visitor reads
the first one, a coding agent reads the second and the fifth, and the third and
fourth are what makes the code usable by anyone.

**The six working files stay at the root because they are NAMED IN `CLAUDE.md`'s
OWN TABLE**, which is loaded on every turn of every session and every background
agent this project spawns. MEASURED 2026-09-24, references across the tree:
`BACKLOG.md` **97**, `LAYOUT.md` **59**, `HANDOFF.md` **52**, `PROGRESS.md`
**45**, `LESSONS.md` **27**, `SUMMARY.md` **11**. That is **291 references** to
move for a tidier `ls`, against the plans move of 2026-09-20 which cost 129, and
unlike the plans move nobody asked for it. ⚠️ **A returning agent needs these
six and a visitor is not harmed by them**, which is the trade the root is
making. It is not open for re-litigation on aesthetic grounds.

**What moved, both with `git mv` so the history follows:**

| from | to | why | references rewritten |
| --- | --- | --- | --- |
| `measured-devices-2026-09-20.md` | `research/measured-devices-2026-09-20.md` | it is a dated measurement, and rule 5 above sends `research/<thing>-<date>.md` there. The name was already in the convention; only the directory was wrong | **27** in **17** files |
| `SECRETS-ROTATION.md` | `research/SECRETS-ROTATION.md` | it REPORTS what was found and what is owed, which is research, and it is not a document a stranger should meet on the front page of a public repository | **7** in **6** files |

⚠️ **The build output under `workers/view/public/` was deliberately left alone**,
as was `archive/`. The first regenerates from `demo/` on the next
`cd workers/view && node build.mjs`; the second records what was there, by the
same rule that keeps `box` and `radio1965` spelled the old way inside it. The
raw grep count of **36** for the devices file is the live **27** plus **9** in
build output.
⚠️ **AND THE FIRST COUNT SAID 35, BECAUSE THE TREE MOVED UNDERNEATH IT.** A peer
session was writing `.claude/skills/positron-verify/SKILL.md` in the same
checkout while the rewrite ran, and the 880 line block it added carried a 36th
reference that no earlier grep could have seen. It was caught by re-running the
sweep at the END instead of trusting the count taken at the start, and it would
otherwise have been the one broken path left. **A reference count is only true
of the moment it was taken**, which is the standing-file staleness rule arriving
inside a single task.

🔴 **AND MOVING `research/SECRETS-ROTATION.md` DOES NOT UNPUBLISH IT. NOBODY SHOULD READ
THE MOVE AS A FIX.** The repository is public and the file is in git history, so
it is fetchable from a clone at its old path forever. It named one credential as
still unrotated, `positron-demo`'s RTMPS stream key, exposed to a session
transcript on 2026-09-10 by a bare `GetStreamServiceSettings`. ✅ **THAT KEY IS
ROTATED, 2026-09-24T19:08:11Z**, through `POST
/stream/live_inputs/<uid>/rotate_keys`, which rotates IN PLACE and left the
input UID alone, so nothing in the repository moved. ⚠️ **THE FILE'S OWN
SENTENCE IS WHAT HELD IT UP**: it said no such endpoint existed and that
rotating meant delete and recreate, which made a one-command fix read as a
scoped refactor. Corrected in place on 2026-09-25. ⚠️ **A history rewrite is not the fix
either** and was not attempted: the file's own §3 already makes that argument
about the `kristjanjansen/studio` exposure, in its own words, that rotating is
what actually fixes an exposure and that rewriting history is optional cleanup
rather than the fix.

---

## Where does a new thing go?

1. **A page a visitor opens** → `demo/<slug>/index.html`, a row in
   `demo/manifest.mjs`, `built: true`. The build ENUMERATES `demo/`, so there is
   nothing to add to an allowlist.
2. **A page that lives somewhere else** — because it belongs with the hardware,
   like the box's listener in `rig/board/` — → a row with `built: false`,
   `page: '/slug/'` and **`src:`**. The build and the dev server both read `src`,
   so it is declared once. It used to need a hand-written line in each, in two
   files, with nothing to notice if only one was made.
3. **Something two pages both need** → `demo/shell/`, which is enumerated too.
   ⚠️ Put it there rather than copying it: this repo has paid for two copies of
   one function twice — `rowHTML` printed `undefined` over every demo name for
   an afternoon, and `demo/shell/moq.mjs` imported a URL that had been renamed
   away, which made two demos assert NOTHING while reading red for a plausible
   wrong reason.
4. **Something that runs on the Pi or the Mac** → `rig/<machine>/`, and
   **declare its dependencies in `rig/audit.mjs`**. A machine set up by typing
   is a machine nobody can rebuild.
5. **A document** → `plans/plan-<thing>.md` if it argues for something,
   `research/<thing>-<date>.md` if it reports. Then REPORT IT IN FULL in the
   reply: a path in a commit message is not a report, and neither is a filename.
6. **Somebody else's binary that one page needs** → `demo/<slug>/vendor/`, and
   **listed BY NAME in `workers/view/build.mjs`**, licence text beside it.
   `demoFiles()` enumerates one directory level and only web extensions, so it
   takes neither a `.wasm` nor anything in a subdirectory — which is the
   containment wall working, not a gap to widen. `patch` is the first of these:
   1.86 MB of AGPL WebAssembly, ten lines in the allowlist, and two of those
   lines are for dynamic imports the page never runs but `checkImports()`
   rightly refuses to ship without. ⚠️ It does NOT go in `demo/shell/`, which is
   enumerated and shared — promoting a 1.86 MB dependency into the kit invites a
   second page to import it without noticing what it costs.

   🔴 **And the SECOND vendored thing broke this rule on purpose — read this
   before moving it back.** The WebXR input-profiles controller meshes live at
   **`demo/shell/vendor/`**, not under a demo. `@webxr-input-profiles/assets@1.0.20`,
   **MIT (Amazon, 2019)**, `meta-quest-touch-plus` at **217,984 + 213,868 bytes**,
   read by `demo/shell/xr-glb.mjs`.

   The reason is the consumer: **`demo/shell/xr-room.mjs` is imported by BOTH
   `scene` and `mirror`**. Under `demo/<slug>/vendor/` one page's controllers
   would come out of a directory named after the other page — and a shared
   module holding a per-slug path is precisely the `moq.mjs` failure this file
   warns about twice.

   ⚠️ So the protection the rule was providing had to be replaced, not dropped.
   `workers/view/build.mjs` now carries **two new refusals** beside
   `checkImports`: `checkPresent` refuses the build when any LISTED file is not
   on disk (a binary is never `import`ed, so no import check can see it), and
   `checkVendorUrls` refuses it when a `/…/vendor/…` string in the SOURCE has
   nothing deployed behind it. Both were proved by breaking them. And at runtime
   a 404 is not fatal: the primitive stand-in draws and the tablet's own face
   says which one you are looking at — where `moq.mjs`'s 404 was silent.

   ⚠️ **The earlier entry here priced these meshes and rejected them.** That
   assessment was overruled by the repo owner, who wanted the real controllers,
   and it deserved to be: one line of its cost — *"a PNG decode"* — was a
   phantom. The image is a byte range handed to `createImageBitmap`; the browser
   decodes it. An argument that carries a free item is wrong even when its
   conclusion is defensible. Re-priced honestly, the reader is **181 lines**.

   🔴 **AND THE THIRD VENDORED THING TOOK THE SAME EXIT, 2026-09-14 — SuperSonic
   (wasm scsynth) IS AT `demo/shell/vendor/` NOW.** It lived at
   `demo/patch/vendor/` while `patch` was its only reader. Two things changed on
   one day: `patch` came off the site (its row is gone from `demo/manifest.mjs`,
   so nothing under `demo/patch/` is copied at all), and `/grains/` started
   booting the same engine to run Pappus in the tab. A page fetching
   `/patch/vendor/…` would be asking for a URL with **nothing behind it**, which
   is `moq.mjs` exactly.

   The alternative was a second copy under `demo/grains/vendor/`, and it is
   worse than it looks: **1.7 MB of AGPL WebAssembly twice**, and a drift
   between the copies is SILENT because each page goes on working.

   What replaces rule 6's protection is the same pair as above —
   `checkPresent()` and `checkVendorUrls()` — plus one more, because these
   binaries have a second failure mode the meshes do not:

   🔴 **`checkCompiledDefs()`, for an artefact that can go STALE rather than
   missing.** `demo/grains/defs/*.scsyndef` are compiled by sclang **on the
   Raspberry Pi** out of `rig/board/norns/Engine_Pappus.sc` and `PosSource.sc`;
   `/grains/` loads them into the tab and claims, in its own diagram, that the
   browser is running the graph the board is running. Edit the engine and the
   board recompiles on its next restart while the checked-in file does not — so
   the tab runs the OLD graph beside the board's new one, **nothing 404s,
   nothing throws, and every number on the page still agrees**, because both
   ends are measured the same way. `demo/grains/defs/PROVENANCE.json` records
   the md5 of every source and every artefact and the build refuses on any
   disagreement, with the recompile recipe in the message. ⚠️ `checkVendorUrls`
   was widened to `/…/vendor/…` **and** `/…/defs/…` for the same reason.

---

## When to take a library, and when to write it

**A library is right when the thing is a DEPENDENCY of the work. Hand-writing is
right when the thing is the SUBJECT.**

The timeline, the strip, the diagram engine, the pattern generator: writing
those is *why* this repo knows that `gl.clear` ignores the viewport, that a
maximum straddles a change, and that three cosines 120° apart sum to a constant.
Nobody learns anything from the four-hundredth glTF parser — so controller
meshes point at a library.

⚠️ **And three.js is still the wrong library, which is a separate question from
whether to take one.** It is not a loader, it is a whole renderer: adopting it
means rewriting both XR pages and discarding the per-eye loop, the blend modes
and the four measured GL defects currently held in their comments. Large price,
small problem. What it IS good for is being READ — `demo/shell/xr-glb.mjs` was
written from the specification and then diffed against `GLTFLoader.js` v0.186.0
(MIT), which is attributed in its header and which **found a real bug**: a
double chunk padding that both vendored files happened to hide.

🔴 **A hand-rolled reader has to name its own expiry**, or it quietly becomes a
project. `xr-glb.mjs` names four triggers — animated parts, skinning, real PBR,
or a model needing Draco or KTX2 — and refuses each of them BY NAME rather than
approximating it.

---

## ⚠️ Two things that look wrong and are staying

Both were priced before being rejected. Neither is visible to anyone using the
site; both are ~400–1000 mechanical edits in exactly the shape this project's
rename lesson is about — *"a rename moves URLs that live in modules, harnesses
and comments, none of which are type-checked"*.

**`demo/` is not in any URL, and that is correct.** `demo/mirror/` is served at
`/mirror/`, `/demo/mirror/` 404s on the deploy, and the dev server tries the
root then `demo/` so both resolve. The directory exists for one concrete reason,
stated in `workers/view/build.mjs`: **the repo root holds `.env` with live
secrets**, and the build ENUMERATES rather than lists. Enumeration needs a
container it can trust. `demo/` is the wall that makes "enumerate, don't list"
safe — it is not organising the demos, it is fencing the enumeration away from
the secrets.

**~~The CSS prefix is `d-`~~ — DONE 2026-09-12, it is `pos-` now.** The
reasoning above said not to: 956 references for a rename no visitor can see.
That held right up until three components written the same day shipped
UNPREFIXED, at which point the cost of NOT doing it became a split convention
every future component has to pick a side in.

⚠️ **The first attempt corrupted 164 files.** It matched BARE WORDS —
`const step` became `const pos-step` — rather than class names. The `d-*` names
are hyphenated and distinctive and were safe both times. If the remaining
unprefixed ones (`.step`, `.sld`, `.choice`) are ever renamed, match
`class="…"` attributes and CSS selectors, never a bare identifier. And syntax
check every module before believing it worked.

**~~And the 23 `plan-*.md` files stay at the root.~~ DONE 2026-09-20 ON
INSTRUCTION: they are in `plans/`.** The reasoning above priced the move at
**421 references**, 74 paths and 347 bare prose citations like `plan-score §1`
where the name functions as a name rather than a path, and rejected it. An
instruction supersedes it, the same way `radio1965`, `box` and `rig/box/`
superseded their own rules. The prose citations were left as citations and the
**129 files holding a real path were rewritten**; `archive/` was deliberately
left alone.

---

## What is untracked on purpose

`rig/` holds **268 tracked files of 65,703** and `proto/` **1,508 of 7,609** —
the rest is captured data, renders and logs, ignored. A large directory here is
not mess; it is a working machine's output. `auto.crt` / `auto.key` are at the
root and are in `.gitignore`.

---

## `.claude/skills/` and the rule that keeps `CLAUDE.md` small

**Seven skills, added 2026-09-21 on instruction** (*"organize claude.md its too
big. should we start doing skills?"*). MEASURED before the split: `CLAUDE.md`
was **2245 lines and 157,181 bytes**, about **39,000 tokens, paid on every turn
of every session and every background agent this project spawns**. It is
**444 lines and 27,576 bytes** now, an **82 per cent cut** to the always loaded
part, and **not one of its 2146 non-blank lines was summarised away**: they are
in `.claude/skills/<name>/SKILL.md`, verbatim, proved line by line.

🔴 **A RULE STAYS IN `CLAUDE.md` ONLY IF IT IS TRUE ON EVERY TASK.** The
workflow, what costs money, what leaves this machine, how work is handed over.
Everything else is a skill.

🔴 **A SKILL IS NAMED FOR THE WORK, NEVER FOR THE CODE.** Somebody about to
change a control has to recognise `positron-ui` from what they are about to do,
not from which directory they will end up in. The `description` in the
frontmatter is the only part that is always loaded, so it is written as a
trigger (*"load before…"*) rather than as a summary of contents.

🔴 **AND WHEN A RULE MOVES, ITS TRIGGER STAYS BEHIND**, as a row in the table in
`CLAUDE.md`. A rule nobody knows to load is a rule that is gone, which is a
worse outcome than a file that is too long.

⚠️ **MOVE A RULE VERBATIM. DO NOT SUMMARISE IT.** The measurements, the dates,
the quoted reports and the wrong first answers are what make a rule survive
being argued with; condensed, it reads as an opinion and gets overruled by the
next plausible argument.

| skill | holds |
| --- | --- |
| `positron-ui` | the kit, controls, readouts, tables, transport bars, CSS, spacing, phone layout, visitor prose |
| `positron-verify` | harnesses, asserts, self-checks, stand-ins, the traps that make a working page read as broken |
| `positron-diagram` | `diagram.mjs`, boxes, labels, subs, notes, arrows |
| `positron-streaming` | HLS, MoQ, WHEP, Cloudflare Stream, the relay, ERR, Durable Objects |
| `positron-xr` | WebXR, the Quest measurements, passthrough, the way out, full screen |
| `positron-hardware` | the board, the rig, Yoshimi, the Circuit, capture |
| `positron-history` | every rename and every retired page |

---

## `purchased/` is for things somebody paid for, and it is ignored whole

**Made 2026-09-21**: *"i purchased them. do not git them"*, *"make a dir for
such things"*, *"just make a positron/something dir and gignore it"*.

🔴 **A PAID SOUNDBANK ARRIVED IN THE REPOSITORY ROOT, UNTRACKED AND UNIGNORED**,
so one careless `git add -A` would have published a commercial patch library
from a repository that gets pushed. The hook in `.claude/hooks/` refuses
`git add -A` here; that is the second line and this is the first.

Anything bought or licensed goes in `purchased/` and nothing in it is committed.
⚠️ **It is one rule about WHERE a thing lives.** A rule per filename rots the
moment the next thing arrives under a different name, and teaches the next
person that a download may sit in the root as long as somebody adds a line.
⚠️ **`New Pack.circuitpack` in the root is the opposite case and stays
tracked**: the owner's own Circuit backup, somebody's only copy, and `CLAUDE.md`
says why it must never be deleted. **Ours to keep, theirs to sell.**
