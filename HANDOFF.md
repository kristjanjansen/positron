# Handoff, 2026-09-23, session 46, OPEN WITH TWO AGENTS MID-EDIT

🔴 **READ THIS FIRST. THE WORKING TREE HOLDS UNFINISHED WORK FROM TWO BACKGROUND
AGENTS THAT WERE STILL RUNNING WHEN THIS WAS WRITTEN, AND A THIRD SESSION'S
FILES ON TOP OF THAT.** Nothing below is lost, but nothing in that set is graded
either, and the usual reflex of building and deploying would ship it.

```sh
node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"   # 61 today, 59 built
git log --oneline -1          # 401975f, and origin is level with it
git status --porcelain        # the in flight set, listed below
```

## What is deployed, and it is BEHIND the tree

**BUILD `8e532d9-123821-2083`**, confirmed on the edge. Everything committed up
to and including the LOCAL AND REMOTE component is live. The two commits after it
are a benchmark and a research document, neither of which a page reads yet, so
the edge is correct and simply older than `HEAD`.

- **https://positron.studio/kit/#local-and-remote** is the new component.
- **https://positron.studio/nola/** and **https://positron.studio/fau/** are
  unchanged from earlier today apart from the black key offset.

## 🔴 THE IN FLIGHT SET, AND WHOSE EACH FILE IS

**Three owners, and telling them apart is the whole point of this section.**

**Another session, do not touch, in none of these commits:**

```
LESSONS.md   demo/verify.mjs   demo/wish/index.html
```

**Agent one, balanced wrapping and the `/kit/` specimens:**

```
demo/shell/shell.css   demo/kit/index.html
demo/click/index.html  demo/grains/index.html
demo/making/index.html demo/mirror/index.html
```

**Agent two, the `/nola/` learning mode:**

```
demo/shell/name.mjs (new)   demo/shell/name-test.mjs (new)
demo/shell/roll.mjs   demo/nola/index.html   demo/manifest.mjs
```

🔴 **AND `workers/view/public/` IS DIRTY WITH ALL OF IT.** One of the agents ran
`node build.mjs` to check that its imports resolve, which is the right thing to
do and copies the working tree while doing it. **So the build output in this
checkout currently contains ungraded, half finished work from two agents and one
other session.** A deploy from here ships that. **Rebuild from a tree you have
decided about before deploying anything**, and read `git status` rather than
assuming the build output is a function of the last commit.

✅ **THE ONE PIECE OF THE LEARNING MODE THAT IS ALREADY PROVED:**

```sh
node demo/shell/name-test.mjs      # 37 ok, 0 failed, no browser
```

That file carries the claim the whole feature rests on, from
`research/chord-learning-2026-09-23.md`: **at a margin of 1.0 the recogniser is
never wrong**, graded over 648 generated voicings. It passes. The research said
that if it went red the idea was dead, so the idea is alive. ⚠️ **THE PAGE HALF
IS NOT FINISHED** and `/nola/` has not been re-verified since the agent started.

## What landed and is pushed

**43 commits ahead of `origin/main`, nothing unpushed.**

🔴 **EVERY CLAUDE ATTRIBUTION TRAILER IS GONE FROM THIS BRANCH'S HISTORY.** The
new global rule says never to add one and to strip any that reached an unmerged
branch. 18 of the unmerged commits carried `Co-Authored-By: Claude`. They were
replayed from base `dc41f851` with `git commit-tree` in a loop, which builds new
objects and touches neither the index nor the working tree, so the other
session's dirty files were never in reach. **Tree `a3caa5e` identical before and
after, 18 commits in and 18 out, author and committer names, emails and dates all
preserved, zero trailers left.** Force pushed with `--force-with-lease`.
⚠️ **AND THE HARNESS WILL KEEP ASKING FOR THE TRAILER.** A system instruction in
every session says to add one. The user's global file overrides it in as many
words. Do not add it back.

**The black keys take half the piano's offset.** `keyboard.mjs` gained
`SHARP_NUDGE = 0.5`, asked for as *"or bit in between current and ideal..."*.
Measured on `/nola/` at 42.7 px a white key:

```
nudge 0    narrowest white strip 16.51 px, black centre 1.00 px off its join
nudge 0.5  narrowest white strip 19.78 px, black centre 2.27 px off its join
nudge 1    narrowest white strip 23.04 px, black centre 5.54 px off its join
```

One pixel of white key for one pixel of alignment, almost exactly. `/kit/`'s
white strip floor came down from 0.5 to **0.44, which is GarageBand's own
ratio**; centring still reads 0.401 and still goes red, so the check refuses what
it was written to refuse.

**`demo/shell/local-remote.mjs`**, 494 lines, one component for a thing here and
the same thing somewhere else. `/kit/` reads **200/200**, of which the block
added 11. `local-remote-test.mjs` is 13 checks with 4 negative controls.

Four decisions in it that are not what the obvious build would be, kept here
because each was paid for:

- **`gain()` is a setter, not a constructor option.** An AudioContext does not
  exist until somebody presses something and this is built at page load, so an
  option would force every page to build its graph on a visit. That is the
  `/reel/` defect.
- **The arrangement is an attribute set off the module's own box width, not a
  media query.** A media query adds no specificity, and **no harness here can
  enter one**: `verify.mjs` runs at 756 px with no viewport override, which is
  how `.pos-pick`'s phone layout sat dead for weeks. `/kit/` now measures the
  phone arrangement at desktop width.
- **The label is one element with two homes**, moved between the bar and the
  pane's own footer. Two elements holding one string is a readout in two files.
- **No opacity and the fader always enabled**, both as asked and then re-asked.

⚠️ **ITS OWN ASSERTS CAUGHT A REAL BUG IN ITS FIRST VERSION.** The seam was a
`border-left` on the second pane, which sits inside that pane's box, so the two
pictures came out 327.5 and 326.5 px and their wells 184.5 against 183.9. Two
panes of one size is the claim the component makes about its subject. A 1 px grid
gap over a coloured ground now, both wells 184.2.

## The chord work, which is the largest thing here

**Two research documents and a shipped table, all committed.**

`research/chord-learning-2026-09-23.md`, 1,174 lines, is the specification for
the learning mode. `research/chord-suggester-benchmark-2026-09-23.md`, 672 lines,
is what happened when the suggester was benchmarked against real music after
*"want them to be openstudiojazz quality stuff"*.

🔴 **THE 173 BYTE DIATONIC RULE FAILS, AND NOT NARROWLY.** Scored on 251 held out
jazz standards and 176 held out pop songs, split by song:

| suggester | jazz top1 | jazz silent | jazz top3 |
| --- | --- | --- | --- |
| 173 byte rule | **1.4%** | **65.3%** | 3.9% |
| constant, always the same two | 13.8% | 0.0% | 25.6% |
| **trigram from corpus** | **48.5%** | 0.0% | **67.4%** |
| random from vocabulary | 1.1% | 0.0% | 3.9% |

**It loses to "always offer these two chords" and sits within half a point of a
hat.** Its problem is the alphabet, not the ordering: only **34.9 per cent** of
real next chords are one of its seven diatonic triads, which is its ceiling with
a perfect ordering. Its earlier 83.8 per cent attestation was computed only over
the third of cases where it speaks.

🔴 **TOP 1 ACCURACY AND `no cliches` ARE OPPOSED, AND THE CONSTANT BASELINE IS
THE PROOF.** It beats the rule on accuracy while offering two distinct chords
ever, half of them the single commonest chord in the corpus. So the third and
fourth chord became two jobs: slot A by probability (48.7 per cent, global
maximum 16.2 per cent of the time), slot B by pointwise mutual information at
pool 4 floor 3 lambda 1 (**90.7 per cent attested, global maximum 1.0 per
cent**). A factor of sixteen less cliche for 2.3 points of attestation.
⚠️ **PURE SURPRISE WITH NO POOL IS THE TRAP** and looks like the boldest setting;
its suggestions are visibly wrong. `random` scores best on both cliche measures
and is **37.7 per cent attested against the trigram's 94.8**, which is what makes
the attestation floor load bearing rather than decorative.

✅ **THE STYLE DIAL IS REAL, MEASURED RATHER THAN ASSUMED.** The two tables name a
different first suggestion for **71.2 per cent of shared bigram contexts**.
Vocabularies barely differ (Jaccard 0.915); placement does, dominants being 40.6
per cent of jazz against 9.6 of pop. ⚠️ **AND THE DIAL HAS A SECOND HALF: 59 of
75 shared symbols are SPELLED differently**, jazz writing `min7`/`maj7` where pop
writes `min`/`maj`. A page that swaps the table and keeps one spelling is half a
dial.

**`demo/resources/chord-tables.json` is 12,746 bytes for both styles**, 0.33 per
cent of what `/nola/` already ships, 67.1 ns a lookup. `build-chord-tables.mjs`
refuses to write unless it decodes its own packing (9 of 9) and reads 0 of 9
against a truncated table. Five requests over the whole job, cached under `tmp/`,
now zero. McGill Billboard at CC0 and iRealPro at CC BY 4.0, attribution beside
the table, **no corpus committed**.

⚠️ **ONE EXPECTATION WAS WRONG AND THE CORPUS CORRECTED IT**, which is the part
worth trusting. `Fm7 Bb7` was written expecting `Cmaj7` first; the table answers
`Ebmaj7` first, 170 observations against 82, because those two chords are a ii-V
in Eb before they are a backdoor into C. `bVII7` resolves to `bIII` 20 per cent
against `I` 19.
⚠️ **AND THE BENCHMARK REFUSES THE PHRASE IT WAS ASKED FOR.** On these numbers
the table knows where the devices go, not what they are called or why. **Nobody
has played any of it.** Slot B being 90.7 per cent attested and 1.7 bits more
surprising is not the same as it sounding good, and that gap only closes at a
keyboard.

## What to pick up, in the order that wastes least

1. **Decide about the in flight set above.** Either let the two agents finish, or
   grade what is there yourself. `node demo/verify.mjs kit nola grains making
   click` and `node demo/verify-gl.mjs mirror` are the pages touched. `/kit/`
   was **200/200** and `/nola/` has not been counted since the edits began.
2. **Rebuild before deploying**, for the reason in the in flight section.
3. **Wire the benchmarked table behind the suggester seam.** The `/nola/` agent
   was told to expose `suggest(context, { style })` with the 173 byte rule as a
   fallback only. The table path is `demo/resources/chord-tables.json`, and the
   page facing module should be `demo/shell/suggest.mjs` with `suggest-test.mjs`
   beside it, owned by whoever owns `name.mjs`. ⚠️ **IT IS FETCHED, so it must
   not be fetched on a visit.**
4. **The style control has not been built.** Only the tables and the measurement
   exist.

## Open findings, all in `BACKLOG.md` rather than in anybody's head

- **`/fau/`'s `a visit fetches no compiler at all` cannot see a fetch that was
  made.** It counts `performance` resource entries, and an entry is written when
  a response FINISHES, so it measures *nothing has arrived* rather than *nothing
  was asked for*. Starting the 6 MB fetch on the load path leaves it green. Same
  shape as `/reel/`, whose `armed` flag suppressed `.play()` and never suppressed
  the fetch.
- **`/nola/`'s pedal check has 3.09 s between asserts** against `verify.mjs`'s
  2.0 s give up. Green today by luck rather than headroom, and the sleeps are the
  measurement, so the repair is an assert mid way or a `settleMs`. ⚠️ **ANYTHING
  ADDED TO THAT PAGE THAT SLEEPS MAKES THIS WORSE**, which is live right now.
- **`demo/wish/index.html:245` is the last 2 px focus ring**, left because that
  file is another session's.
- **`demo/shell/midi.mjs:72` puts a middot in every MIDI page's log.** Shared, so
  decided once rather than swept per demo.
- **`/items/` draws two containers with nothing in them.**

## The three things that cost time today, so they cost nobody else any

- **A declaration shadows its whole block from the top.** Three temporal dead
  zones in one session, each one reading as a different bug.
- **A count written into a comment goes stale silently.** `chords-test.mjs`
  prints 49 today and three comments in two files said 36, 27 and 49, all true
  when written. Two of them now name the command instead of carrying a number.
  It is `CLAUDE.md`'s count-them-never-remember-them rule one level down.
- **The reading of an instruction that destroys work is the one to check first.**
  *"no continous vertical bars on pianoroll!"* was read as *remove them* and
  meant *they are not continuous*, and an hour of work went in the bin.
