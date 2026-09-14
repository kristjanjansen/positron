# plan-agents — what makes this repo hard for two agents at once

Written 2026-09-14, session 24, after reading `CLAUDE.md`, `LAYOUT.md`,
`HANDOFF.md`, `LESSONS.md` and the harnesses they describe. It proposes; it
changes nothing yet.

**The finding in one line:** this repo has already learned every rule it needs
for concurrent work — *a fixed port is a shared mutable global*, *report rather
than arbitrate*, *a rule to remember is the weakest kind of guard* — and applies
them to browsers, sockets and Raspberry Pis. It does not yet apply them to
**itself as a workspace**, where the other process is another agent.

Nothing below is a new principle. Each item is an existing rule of this repo,
pointed at a resource the rule has not been pointed at yet.

---

## 0. What I measured first

| | |
|---|---|
| working tree, measured before this file existed | **60 files dirty, 45 M + 15 ??** |
| of those, hand-written | **0** |
| all 60 | `workers/view/public/`, mtime `10:57:36`, one `node build.mjs` |
| `.claude/` in the repo | **does not exist** — no settings, no hooks, no agents |
| `CLAUDE.md`, auto-loaded per agent | 52 KB, **~13k tokens**, times N agents |
| what "read md's" costs if taken literally | **63 documents, 2.5 MB, ~630k tokens** (`plan-*` 238k · `research/` 185k · PROGRESS 97k · HANDOFF 38k · LESSONS 29k) |
| harnesses still holding a fixed port or profile | **4** (`verify-native`, `verify-safari`, `verify-gl`, `perf-wire`) |
| `verify-native.mjs`'s Chrome profile | a **dead session's scratchpad under the OLD repo name** — see §6 |

The first row is the headline. **Every agent that opens this repo today reads a
sixty-file diff in which nothing was written by a person.** That is the cost
being paid, every turn, by every agent, before any work starts.

---

## 1. `workers/view/public/` is a shared mutable global (P1)

`build.mjs` line 32: `const OUT = join(HERE, 'public')`. Line 480:
`await rm(OUT, { recursive: true, force: true })`.

A fixed output directory that is wiped and rewritten is **exactly** the shape of
CLAUDE.md's own rule — *"a fixed port is a shared mutable global … let the OS
choose and read back what you got"* — and the same rule in `verify-gl.mjs`'s
comment, *"a fixed CDP port means you may be talking to the previous browser."*
Three consequences, in rising order of nastiness:

1. **Noise.** 120 tracked files rewritten by a mechanical action, so `git
   status` cannot be used to see what anybody actually changed. Which is also
   what makes `git add -A` so expensive here (§2).
2. **A race.** Two agents building at once: one `rm`s the directory the other is
   copying into. The build has no lock and cannot tell it happened.
3. 🔴 **A mis-attributed deploy.** Agent A builds, agent B builds, agent A runs
   `npx wrangler deploy` — and ships B's tree under B's `BUILD` stamp. CLAUDE.md
   says *"attribute a run to a build before iterating on it"* and *"confirm the
   stamp changed before asking anyone to retest."* Both silently stop working:
   the stamp DID change, and it is the wrong build's.

Committing `public/` is deliberate and defensible — `git log` shows `build:
<sha> — <title>` commits, a record of what was deployed. Keep that. What has to
change is the other twenty-three hours of the day, when `public/` is dirty for
no reason anybody wrote.

**Proposed — three small changes, none of which drop the provenance:**

- **`node build.mjs --out <dir>`** (~4 lines). An agent asking *"does the build
  still pass?"* — which is what `checkImports`, `checkPresent`,
  `checkVendorUrls` and `checkCompiledDefs` exist to answer — builds into a
  temp dir and dirties nothing. This is the single highest-payoff line in this
  document: it makes the most-run command in the repo side-effect-free.
- **Put the working tree in the stamp** (~5 lines). `BUILD_STAMP` is
  `<sha>-<hhmmss>` today, with a comment admitting the sha alone is not enough
  *"because an uncommitted edit deploys under the previous one."* With one agent
  the timestamp covers it. With three it says **when**, never **whose** — two
  trees, same sha, seconds apart. Add four hex of a digest over the allowlisted
  file contents: `<sha>-<hhmmss>-<tree4>`. Same length class, and now a stamp
  identifies a tree.
- **`node workers/view/deploy.mjs`** (~20 lines) — build, record `OUT`'s mtimes,
  deploy, and **refuse** if anything under `public/` changed between the two. A
  build and a deploy that are not interlocked are two facts about different
  trees.

⚠️ What I would NOT do: untrack `public/`. The `build:` commits are how anyone
answers *"what was actually on the edge when that log was written?"*, and this
repo has paid for exactly that question before.

---

## 2. `git add -A` has cost this repo twice and is still only a sentence (P2)

CLAUDE.md, in full:

> **A background agent must not commit.** … It happened twice in one session:
> `timeline/score.mjs` and `csound.mjs` — the whole score container — landed
> inside a commit about `loops` … **Agents report; the session commits.**

That is a correct rule, written after the damage, and it is what `verify.mjs`
line 61 calls *"the weakest kind of guard: it only fires if the person reading
the output happens to recall it."* `verify.mjs` fixed its own version of this by
making the harness **say it at the moment the output is read**. The same move is
available here and it is stronger, because a hook does not depend on recall at
all.

**Proposed:** a checked-in `.claude/settings.json` with a `PreToolUse` hook on
`Bash` that **refuses** — not warns —

- `git add -A`, `git add .`, `git add :/`, `git commit -a`
- `git checkout .`, `git restore .`, `git stash` with no pathspec, `git clean -fd`
  — each of which discards another agent's uncommitted work, which is worse than
  mis-attributing it

with a message naming the alternative: *stage the paths by name.* That is the
second half of the existing rule, so the hook teaches what CLAUDE.md already
says rather than adding a policy.

It is ~30 lines of JSON and shell, it travels with the repo, and it turns the
one failure this project has actually suffered twice into one it cannot suffer
again. And CLAUDE.md already says how to ship it — **"Prove a guard fires.
Break the thing on purpose once."** Run `git add -A` and watch it refuse.

⚠️ **And one sentence in CLAUDE.md needs correcting for the same reason.** It
says to *"kill stray `user-data-dir=/tmp/…` Chromes."* With one agent that is
housekeeping. With three it kills a peer's in-flight run, and the peer reads
RED — the exact false regression the "run the failing demos ALONE" rule exists
to prevent, now caused by the remedy. It should say: kill by the profile prefix
**you own**, or only profiles older than the run you are about to start.

---

## 3. "read md's" costs ~480k tokens and nobody meant it literally (P3)

`PROGRESS.md`'s own session titles record the instruction verbatim — sessions
**14 and 16** both open `(user: "read md's" → …)`, and 9 and 11 close with
*"save status/progress to md's"*. It was written when it meant four files. It
now addresses **63 documents, 2.5 MB, ~630k tokens** at the root and in
`research/`, and a subagent handed it has no way to know which three of the
sixty-three answer its question.

The repo already has the answer in `LAYOUT.md` — *"read this before adding a
file. It is short on purpose"* — and just never extended it from **where a file
goes** to **which document to read**.

**Proposed:** one table, ~20 lines, at the top of `LAYOUT.md` (which is already
the short one) and referenced by name from `CLAUDE.md`:

| I need to know | read | cost |
|---|---|---|
| the standing rules — always | `CLAUDE.md` | 13k |
| where a new file goes | `LAYOUT.md` | 2k |
| what is open right now | `HANDOFF.md` §top only | ~4k |
| why a rule exists, before arguing with it | `LESSONS.md`, **by number** | grep, not read |
| what was measured, and when | `PROGRESS.md`, **newest session only** | ~10k |
| the argument for a thing already proposed | the one `plan-<thing>.md` | varies |
| what is true about the outside world | `research/<thing>-<date>.md` | varies |

with one rule under it: **`LESSONS.md` and `PROGRESS.md` are grepped, never
read.** Both are newest-first and both are history; an agent that reads either
end to end has spent 100k tokens to learn what one `grep -n` would have told it.

⚠️ **And while checking this I found the counts in `LAYOUT.md` are already
wrong.** It says *"23 documents that PROPOSE"* and *"20 documents that REPORT"*;
measured today, it is **31 and 24**. The same sentence is load-bearing in its
own argument — *"the 23 `plan-*.md` files stay at the root … MEASURED at 421
references"* — so the price of the rejected move is quoted against a number
that has grown by eight documents since.

This is `CLAUDE.md`'s own header rule arriving somewhere else: *"the suite total
… was removed rather than updated: it was stale for two sessions, and a count
nobody re-measures reads as a fact."* **A hand-typed count is the first thing
concurrent agents break**, because adding a document is the one thing every
agent does and no agent thinks of as a change. Either drop both counts, or make
them a line of output — `ls plan*.md | wc -l` in the doc, the way CLAUDE.md now
says *"run `node demo/verify.mjs` for the current one."*

---

## 4. `CLAUDE.md` is a per-agent tax, and routing beats deleting (P4)

13k tokens, auto-loaded, times every agent in every session. Roughly half of it
is **platform facts scoped to one subsystem** — Cloudflare Stream billing,
MoQ-on-Safari, ERR's programme-based 403s, the Quest framebuffer, the
`ManagedMediaSource` gate. An agent writing a granular synth pays for all of it.

⚠️ **The obvious move — cut it — is wrong, and this repo has the receipts.**
LESSONS #80: the constraint *"this machine SIGKILLs locally compiled binaries"*
was written down in **two** research files and was re-learned anyway, at the
cost of security prompts on the owner's screen. A fact moved out of the
auto-loaded file is a fact that will be re-learned by measurement.

So: **route, do not delete.** Move each subsystem block to
`.claude/skills/<area>/SKILL.md` — or plainly to `docs/facts-<area>.md` — and
leave in `CLAUDE.md` a one-line trigger naming **when** to read it, the way the
`claude-api` skill's description does:

    Before touching HLS, WHEP, MoQ or anything on Cloudflare Stream, read
    docs/facts-streaming.md. It holds seven facts that each cost a session.

The trigger stays auto-loaded; the 8k tokens of detail load only for the agent
that is about to step in it. Estimated: **13k → ~5k** auto-loaded, with no fact
lost and every fact still one named hop away.

⚠️ Do this **after** §1 and §2. It is the largest edit here and the only one
that can lose something.

---

## 5. The single devices: report, never arbitrate (P5)

`HANDOFF.md`: *"Needs the board — take turns, it is one Raspberry Pi."*
That is a prose rule about a resource that already has a better mechanism
attached to it. `rig/box/box.mjs`'s `clientSeen` map solved this properly for **tabs**:

> **NO TTL, NO RELEASE, NOTHING TO LEAK.** A lease nobody can clear is how
> `studio-1` sat full for hours … a client that is still there keeps talking.

and, above it, the reason the box *reports* rather than arbitrates:
*"arbitration that hides a conflict converts a visible problem into an invisible
one."* Both are exactly right and neither is available to an agent, which has to
run four different commands to find out whether it is about to trample someone.

**Proposed: `node rig/who.mjs`** — one command, ~60 lines, all of it aggregation
of things that already exist, and **no locking whatsoever**:

- stray headless Chromes — lift `peerBrowsers()` out of `verify.mjs:73`, which
  already excludes helper processes and already got the 19-for-2 overcount wrong
  once so you do not have to
- relay occupancy — `GET /room/studio-1/stats`, which already prints per-socket
  idle
- who holds the board's insert — `ask.mjs --room studio-1 audio.status` already
  returns `fxBy` / `fxHeld` / `fxAgoSec`
- `pgrep -cx ffmpeg` on the board (`-x`, never `-f` — LESSONS #39)
- `adb devices` for the Quest

It answers one question — *is it safe for me to run this right now?* — and it
answers it the way the box does: by saying what is true, and letting the agent
decide. ⚠️ It must not grow a lock. A lease an abandoned agent cannot clear is
the `studio-1` outage with a new owner.

---

## 6. Four harnesses still hold a fixed port, and one is worse than that (P6)

CLAUDE.md carries the rule twice and `verify.mjs`, `verify-gl.mjs` and
`verify-quest.mjs` now apply it — port 0, read back `server.address().port`,
read the CDP port out of `DevToolsActivePort`. The sweep stopped short:

| file | what is fixed | with two agents |
|---|---|---|
| `verify-native.mjs:29` | CDP `9333` | attaches to **the other agent's browser** — the exact bug `verify-gl.mjs:52` warns about |
| `verify-native.mjs:31` | the profile dir | **see below** |
| `verify-native.mjs:81` | `http://127.0.0.1:8890/demo/…` | `serve()` moves to 8891 when 8890 is taken, so this points at a server that may not be there |
| `verify-safari.mjs:21` | safaridriver `4577` | second run dies on bind |
| `verify-gl.mjs:61,88` | `/tmp/positron-verify-gl` + `pkill -f` on it | agent B's `pkill` kills agent A's browser mid-run |
| `perf-wire.mjs:6` | points at `localhost:8788` | a second `wrangler dev` for backlog cannot bind it, and this client cannot tell |

🔴 **And the fossil count in this section was wrong by a factor of twenty.**
It said one file, then two. Swept properly on 2026-09-14: **44 source files**
(`.mjs`/`.sh`) hardcode a scratchpad path belonging to a dead session, across
**three session UUIDs, all three of which are gone from disk** — 29 under
`596385e3-…`, 15 under `3e55abee-…`, one each under `399cfe11-…` and the
elektron-era `d558ee42-…`. By directory: `proto/m2m` 9, `timeline/lab` 6,
`proto/selfrec` 5, `proto/jam/harness` 4, and singles or pairs across `studio`,
`rig`, `workers/view`, `proto/*`.

Every one is the same two defects at once: a path nobody can reach, and a
CONSTANT where a per-process value belongs — so two agents running any two of
these share one Chrome profile and one scratch directory. They never complain,
because a write creates what it needs.

**Fixed in this pass: 6** — the five harnesses below plus `workers/view/verify.mjs`.
**The remaining 38 are in `proto/`, `timeline/lab/`, `rig/` and `studio/`** and
are NOT done. ⚠️ They are a separate, mechanical, 38-file sweep in exactly the
shape this repo's rename lesson is about, and doing it while another agent holds
an uncommitted tree is how you get the failure instead of the fix.

**The one that mattered most was `verify-native.mjs:31`:**

    const udd = '/private/tmp/claude-501/-Users-s32863-personal-elektron/
                 d558ee42-19e7-4e7e-b95a-63e51b4c5e37/scratchpad/native-udd';

A **dead session's UUID**, under the repo's **pre-rename name**. Checked: the
path does not exist. Chrome creates it, so the harness "works" and nothing ever
said otherwise. This is the third surviving artifact of the elektron→positron
rename — CLAUDE.md already records that the same rename left this same file
pointed at a 404, *"which is the iPhone path."*

It matters more than the other rows because `verify-native.mjs` is **the only
harness that reaches the iPhone code path**, the one CLAUDE.md says `verify.mjs`
cannot see and whose absence once let a TDZ error reach a phone under a
261/261 green suite.

**Proposed:** finish the sweep. Port 0 everywhere, profiles under
`mkdtemp`/`${process.pid}` as `verify.mjs:36` already does, each harness starting
its own `serve()` and reading the port back. ~15 lines across six sites, and one
fossil deleted.

---

## 7. `HANDOFF.md` and `PROGRESS.md` are shared mutable state too (P7)

They are 2,563 and 6,169 lines of **prose**, both newest-first, both edited at
the top, and the rule is *"agents report; the session commits."* So the reporting
channel for N agents is two files with a single hot edit point. Git cannot merge
prose; a conflict there is re-read by a person, and the thing most likely to be
dropped in the re-read is the numbers — which are the whole point of both files.

**Proposed, and deliberately the cheapest thing that works:** a `notes/`
directory, one file per agent per session — `notes/s24-<topic>.md`, append-only,
gitignored or not as you like. An agent writes there and nowhere else; the
session folds them into `PROGRESS.md` and `HANDOFF.md` when it commits, which is
the fold it is already doing by hand today.

Cost: one more place to look, and a fold that can be forgotten. Benefit: two
agents reporting at once stop being a merge conflict in the file whose value is
that it is trustworthy. ⚠️ If the fold is skipped, the notes are still on disk
and still readable — a conflict in `PROGRESS.md` can lose a measurement outright,
which is the failure this repo minds most.

---

## 8. What a checked-in `.claude/` would hold

There is none today, so every agent negotiates permissions from scratch and none
of the guards above can exist. Minimum useful contents:

- **`settings.json`** — the §2 hooks, plus a permissions allowlist for the
  read-only commands this repo runs constantly (`node demo/verify.mjs …`,
  `git status/diff/log`, `curl` at the relay's `/stats`, `ssh positron@… <read
  command>`). Three agents each prompting for `git diff` is three interruptions
  for the owner, which LESSONS #80 is precisely about: **the owner's attention
  is a shared resource and an agent spends it without meaning to.**
- **`agents/harness.md`** — an agent that runs verifies and reports numbers, with
  `Write`/`Edit` withheld. Most concurrent work here is measurement, and a
  measurer that cannot write cannot collide.
- **`agents/scribe.md`** — the one agent allowed to touch `PROGRESS.md`,
  `HANDOFF.md`, `LESSONS.md`. Single-writer by construction beats a convention
  about single writers.

---

## 9. Priced and rejected

- **Untracking `workers/view/public/`.** The `build:` commits are the record of
  what was on the edge. Keep them; fix the noise with `--out` (§1).
- **A worktree per agent.** Clean in principle, and it breaks the things this
  repo's work actually touches: one `.env`, one Raspberry Pi, one Quest, one
  relay room, one `/dev/video11`. Isolating the *files* while every *device*
  stays shared moves the collision without reducing it, and doubles the checkout
  of a repo whose `rig/` is 65,703 files.
- **A lock on the board.** See §5. `box.mjs` already argues this better than I
  can, and `studio-1` already paid for it.
- **Splitting `CLAUDE.md` by deleting.** See §4 — LESSONS #80 is the counter-
  example and it cost somebody their afternoon.

---

## 10. Order

| | change | size | why first |
|---|---|---|---|
| **P1** | `build.mjs --out`, tree digest in the stamp, `deploy.mjs` interlock | ~30 lines | removes 60 files of noise from every agent's `git status` |
| **P2** | `.claude/settings.json` + the `git add -A` hook | ~30 lines | the one failure this repo has actually suffered twice |
| **P6** | finish the fixed-port sweep; delete the dead-session path | ~15 lines | six known collisions, and one live fossil on the iPhone path |
| **P5** | `rig/who.mjs` | ~60 lines | makes "take turns" checkable instead of remembered |
| **P3** | the reading table in `LAYOUT.md` | ~20 lines | 480k tokens → ~20k, per agent |
| **P7** | `notes/` | a directory | needed as soon as two agents write prose |
| **P4** | route `CLAUDE.md`'s platform facts | large | biggest win, biggest risk — do it last, lose nothing |

P1, P2 and P6 together are about eighty lines and they remove every collision I
could actually demonstrate. Everything after that is about what the work costs
rather than whether it breaks.

---

## 11. What was built — 2026-09-14, session 24

P1, P2 and P6 are done. Every guard was proved by breaking it on purpose, which
is the only reason any of it is written down as working.

| | file | proof |
|---|---|---|
| **P1** | `workers/view/build.mjs` — `--out <dir>`, `checkOut()`, tree digest in the stamp | scratch build of 148 files left `public/` byte-identical; 4 refusals fire; `/tmp` file survived the one aimed at it |
| | `workers/view/deploy.mjs` — new, build↔deploy interlock | detects `rewritten` / `vanished` / `appeared`, no false alarm on identical bytes |
| **P2** | `.claude/settings.json`, `.claude/hooks/guard-tree.mjs`, `.claude/README.md` | **33/33** — 16 blocked, 17 allowed |
| **P6** | `demo/verify-native.mjs`, `verify-gl.mjs`, `verify-safari.mjs`, `perf-wire.mjs`, `workers/view/verify.mjs` | two `verify-native` runs CONCURRENTLY, both PASS; `verify-gl` 91/91; `workers/view/verify` 38/39→**39/39** |

### The stamp proof is the one worth keeping

Two builds, same commit, **same second**, different working trees:

    874d45a-100407-f5d7      one line added to shell.css
    874d45a-100407-25c7      the same tree with it removed

The clock cannot tell those apart and the sha cannot either. That is the whole
argument for §1's third bullet, and it is now measured rather than reasoned.

### 🔴 And the hazard fired DURING this work, which is the best evidence in here

The deployed stamp read **`874d45a-101113-c616`** — three fields, so built by the
NEW `build.mjs`. Nobody deployed it from this session. The other agent in this
checkout ran `node workers/view/build.mjs` and `wrangler deploy` at 10:11:13 UTC,
eight minutes after an **uncommitted** edit of mine changed what that command
does, and shipped it to production without either of us intending it.

It worked — the site is up, the stamp is well-formed, `workers/view/verify.mjs`
is 39/39 against it. That is luck, not design. **A shared checkout means an
edit to a build script is live for everyone the moment it is saved, with no
commit, no review and no announcement between the edit and the edge.** §1 argues
this from first principles; this is the same thing happening while the argument
was being written.

⚠️ It is also the strongest case for `deploy.mjs`: had the interlock been in
use, that deploy would have said which tree it was shipping.

### One thing found that was not in the plan

`workers/view/verify.mjs`'s index assert required `/^\/\d\d-[a-z]+\/$/` — the
**pre-rename numbered URL**. MEASURED: **0 of 44 linked targets matched it, and
all 44 answered 200.** It could not pass, so that harness had a standing red
that meant nothing — which is precisely what trains a reader to ignore a red
run. Fixed, and the new predicate was proved to still REFUSE `/05-mirror/`,
`/floor`, `/Floor/` and `/shell/shell.css` rather than waved through.

### And a seventh instance, created by verifying the sixth

Running `workers/view/verify.mjs` twice wrote **7 tracked files** — six
screenshots under `workers/view/shots/` and `verify-report.json` — straight into
the shared tree. A harness that reads a deployment dirtied somebody else's
`git status` as a side effect of being run. That is §1 exactly, in a smaller
costume: **a fixed output path inside the repo**. It wants the same `--out`
treatment, and it is not done.

(They were restored rather than left. Newer screenshots of the current deploy
are arguably better than the committed ones — but updating another agent's
artefacts mid-flight is not a call this session gets to make silently.)

### Not done, and why

- **The other 38 fossils** (§6). Mechanical, cross-cutting, and the wrong thing
  to do with another agent's tree uncommitted.
- **`verify-safari.mjs` was not RUN.** Its change is mechanical and syntax-checked,
  but running it drives the owner's real Safari window, and Remote Automation is
  a global switch on a machine somebody is using.
- **`perf-wire.mjs` was not RUN.** Its job is to saturate the relay, which is
  the shared resource §5 is about.
- **`deploy.mjs` has never deployed.** Its interlock is proved; the upload path
  is not. First real use should be watched.
- **P3, P4, P5, P7** — unchanged from §10.
