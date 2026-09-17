# Handoff, 2026-09-18, session 32

**DEPLOYED.** Confirm the BUILD stamp on the edge before asking anybody to
retest: the edge serves the previous build for a few seconds after a deploy, so
"still broken" and "the fix never loaded" are the same observation until the
stamp changes.

## What landed

**A component, `demo/shell/glue.mjs`.** Blocks as ONE surface: one border round
the lot, 1 px of `--line` as a seam, children giving up their own border and
radius. `.pos-glue` in shell.css is the look; `.pos-report` is now that class
plus the single declaration that is its own (where it sits on the page).
`/stage/` glues its transport bar to its strip. It is at the TOP of `/kit/`,
which is the convention for a new component.
⚠️ **`createGlue()` OF ONE BLOCK RETURNS THAT BLOCK**, and of none returns
`null`, because a container with nothing in it must not paint its edges.
⚠️ **THE CHILD RULE IS `.pos-glue.pos-glue > *` AND THE DOUBLING IS LOAD
BEARING.** A single class ties with `.pos-strip` and `.tbar` and would be
decided by source order, which is the trap this stylesheet already records three
times.

**No more black rules between lanes** (`timeline/strip.mjs`). The band is its
lane's full height; it was `L.height - 1` against lanes that tile exactly, so
every lane gave back one row of darker canvas ground.

**`createTransportBar` takes `time: false`.** `/stage/` was passing
`clock: false`, which the bar has never read.

**`/stage/`**: every screen goes fullscreen with a footer variant, answers are
recorded rather than invented, one lane per option, and the frame burns the
show's real wall-clock start.

## 🔴 Two things to read before touching a check

**A CHECK WHOSE SUBJECT IS ABSENT READS AS A CHECK THAT PASSED.** The new
"no black rule between the lanes" assert on `/stage/` passed, and passed with
IDENTICAL numbers when the defect was put back, because the archive strip holds
one lane until a question is asked and there was no boundary in the picture at
all. It asks a real question through the page's own `ask()` first now and
reports its lane count in the message, so a future blind run says so.

**AND A TOLERANCE CHOSEN AGAINST A BLIND MEASUREMENT IS CHOSEN AGAINST
NOTHING.** That check's threshold was 24 while the real separation is **0
against 21**, so the number picked would have passed the defect it exists to
catch. Thresholds go BETWEEN two measured states, and the sabotage that produces
the second state is not optional.

## What is open

`BACKLOG.md` is the list. Two entries were added this session from the feedback
room rather than from a conversation:

- **A real Gmail message puts its HTML half in the room beside its text.** 51
  fixtures green, found by reading `/feedback/`. **Capture the raw message before
  touching `firstText()`** — a guess at the cause is another fixture that passes
  while real mail does not.
- **The mail auth question is still open.** Two real messages arrived; the room
  shows `[ok]` on the second and nothing on the first (a pre-labelling build, not
  a verdict). A four-character prefix cannot say WHICH signal decided it.

## Rules that cost time this session

🔴 **`node demo/verify.mjs` WITH NO ARGUMENTS RUNS `/tapes/`, WHICH FETCHES REAL
RECORDINGS FROM ARCHIVE.ORG.** I started one and killed it. CLAUDE.md forbids it
in a development loop and the bare command is how you do it by accident. Name the
pages: `node demo/verify.mjs stage kit radio knobs replay`.
