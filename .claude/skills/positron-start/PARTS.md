# Taking a piece of this repository into somebody else's project

**positron-start/PARTS.md, revision 2026-09-25.** Say it once, for the reason
in `SKILL.md`: a clone of this repository serves a frozen copy and the URL
serves the current one, and only a stated revision tells them apart.

🔴 **THEY ARE NOT CLONING THIS REPOSITORY, AND MOST OF THE TIME THEY SHOULD
NOT.** The person reading `positron-start` is building their own thing, on their
own account, in whatever shape they prefer. What they want out of here is
usually ONE file that solves a problem that took somebody months to get right.
So the unit of reuse is a FILE, fetched, and this page is how.

⚠️ **AND THIS FILE EXISTS BECAUSE THE INSTRUCTION KEPT GETTING WRITTEN OUT ONCE
PER SUBJECT.** The low-latency player got a `curl` line of its own inside the
live-video step, which is the shape that produces four slightly different
versions of the same instruction as more parts get listed. The mechanics are
general; only the part list changes.

---

## The two base URLs, and they are interchangeable

```
https://raw.githubusercontent.com/kristjanjansen/positron/main/<path>
https://positron.studio/<path minus the leading demo/ or src/ stays as-is>
```

MEASURED 2026-09-25: `raw.githubusercontent.com/.../src/low-latency-player.js`
and `positron.studio/src/low-latency-player.js` both answer **200 with the same
51,125 bytes**. Prefer the raw GitHub one, which is the whole tree. The
positron.studio one serves what was deployed, so it is the fallback when GitHub
is blocked, and it only carries what the build copied.

⚠️ **RAW GITHUB CACHES FOR A FEW MINUTES.** A file edited here minutes ago is
not what a fetch returns. `cmp` before concluding anything about a difference.

## The command, and YOU run it

```sh
mkdir -p src
curl -fsSL -o src/<file> \
  https://raw.githubusercontent.com/kristjanjansen/positron/main/<path>
```

`-f` matters: without it a 404 is written into the file as HTML and the failure
surfaces later as a baffling syntax error.

---

## Four checks before you promise them a file transfers

🔴 **1. IS IT STANDALONE? CHECK, DO NOT ASSUME.** A file that imports something
else from this repository drags a tree behind it, and the failure arrives after
they have already built on it.

```sh
grep -n "^import \|require(" <file>
```

**Node builtins (`node:http`, `node:fs`) are fine.** Anything with a `./` or
`/shell/` in it is not, and means either taking that file too or not taking this
one.

⚠️ **2. WHAT LICENCE IS IT?** The repository is MIT, and `NOTICE.md` indexes
every exception. The ones that matter: **`demo/grains/` and `demo/patch/` are
AGPL-3.0-or-later**, which means serving them over a network triggers the
obligation, and several vendored binaries carry their own terms. Read
`https://raw.githubusercontent.com/kristjanjansen/positron/main/NOTICE.md` before
copying anything under `demo/`.

🔴 **3. DOES IT POINT AT SOMEBODY ELSE'S SERVER?** Several pages here play a
public broadcaster's live streams, and every connection appears in that
broadcaster's audience measurement. They told us so. If a file has a URL in it
that is not theirs and not ours, it does not go into their project until that
URL does.

🔴 **4. IS IT A MEASUREMENT?** Every number written down in this repository is a
measurement of one machine, one network and one account on a stated day. Numbers
are not portable. Take the code and re-measure.

---

## The parts that are known to transfer

Every row VERIFIED 2026-09-25: the URL answers 200, and the file has no
repository-internal imports.

| what it solves | path | size | needs |
| --- | --- | --- | --- |
| LL-HLS that holds its latency and recovers from real live faults | `src/low-latency-player.js` | 1,070 lines | `window.Hls` loaded first, as a global build |
| Cues beside a live stream, aligned by wall clock rather than in-band metadata | `src/timed-messages.js` | 228 lines | a player instance and a video element |
| Creating a Cloudflare live input that is ACTUALLY low latency | `src/provision.sh` | 44 lines | `CF_API_TOKEN`, `CF_ACCOUNT_ID` |
| ffmpeg publish arguments that LL-HLS accepts | `src/publish.sh` | 67 lines | ffmpeg |
| A local Icecast that is nobody's radio | `demo/fake-station.mjs` | 240 lines | node only |
| A local archive that is nobody's archive | `demo/fake-tapes.mjs` | 388 lines | node only |
| A local live edge that is nobody's broadcaster | `demo/fake-err.mjs` | 560 lines | node only |
| A relay for live messages between viewers: one Worker, one Durable Object | `workers/relay/src/index.js` | 287 lines | a DO binding and a SQLite migration |
| The browser side of that relay, with reconnect and backpressure already thought about | `demo/shell/wire.mjs` | 317 lines | nothing |

✅ **THE RELAY PAIR IS WHAT MAKES "A STREAM WITH QUESTIONS ON IT" POSSIBLE AT
ALL, AND BOTH HALVES ARE STANDALONE.** VERIFIED 2026-09-25: **neither file
imports anything**, the Worker needs one Durable Object binding and one
`new_sqlite_classes` migration, and that is the entire server side. A live
stream is one-way; anything a viewer sends back needs a second channel, and this
is a small enough one to read in an afternoon. Its hard-won parts are the token
bucket, the byte budget (fan-out multiplies egress by the number of sockets, so
the limit is bytes per second rather than message size), and reclaiming idle
sockets only when a room is full.

✅ **THE THREE STAND-INS ARE THE UNDER-RATED ONES.** They let somebody develop
and test against the SHAPE of a live radio stream, an archive and a live edge
without opening a single connection to anybody's real server. That is the rule
about other people's servers turned into something runnable, and it is the part
of this repository most likely to be useful to somebody whose project has
nothing else in common with it.

⚠️ **`src/low-latency-player.v5.js` IS KEPT FOR COMPARISON AND IS NOT THE ONE TO
TAKE.** `rig/resilience-v6.html` loads both to A/B them. Take the unsuffixed
file.

---

## What is NOT a part, however much it looks like one

🔴 **`demo/shell/` IS ONE PROJECT'S TASTE IN BUTTONS.** It is the largest
directory of reusable-looking code here and it is the wrong thing to copy. Their
project should have its own controls, in whatever framework or none they prefer.
**The transferable idea is *a kit rather than a control hand-rolled per page*,
not *this kit*.** Read it for the arguments in its comments.
🔴 **NOTHING UNDER `rig/` RUNS FOR ANYBODY ELSE.** It talks to one Raspberry Pi
in one building and to MIDI devices on one desk. Worth reading, will not run.
⚠️ **AND A WHOLE DEMO PAGE IS RARELY THE ANSWER.** A page here is one idea
wired to this repository's shell, its manifest and its harness. The idea
transfers; the page mostly does not.

---

## Adding a row to the table above

A part earns a row by being **fetched, checked for imports, and run somewhere
that is not this repository**. A file that looks reusable and has never been
lifted out is a guess, and this table's only value is that its rows are not
guesses. Add the date it was checked, because a row here goes stale exactly the
way every other written-down claim in this project does.
