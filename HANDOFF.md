# Handoff, 2026-09-21, session 41

**Six commits, deployed three times, and one published claim was disproved by
the file it was written about.**

🔴 **READ THIS FIRST. THE PUSH COMMAND IN THE LAST HANDOFF WAS WRONG AND WOULD
HAVE DESTROYED NINE DAYS OF HISTORY.** It said to push `6a8befc:main`. That
commit is from **2026-09-12** and is **464 commits behind `HEAD`**. The lease sha
in it was right, so the command would have SUCCEEDED and left `origin/main` at a
nine day old tree. It is the fourth session running that this needs a person.

```sh
gh auth switch --user kristjanjansen
git push --force-with-lease=main:4add3238cd812195db75fddfe405786fe5359a8b origin HEAD:main
gh auth switch --user Kristjan-Jansen_enefit
```

`HEAD` is **`999487e`**, 73 ahead of the merge base. The one remote-only commit
`4add323` is **pure renames, zero insertions and zero deletions**, and all 64
plans are in `HEAD`'s tree, so discarding it loses no content. ⚠️ **Verify the
tip you are pushing before you run any command out of this file**: `git log -1`
and `git rev-list --left-right --count origin/main...HEAD`.

✅ **THE TREE IS CLEAN AND EVERY COMMIT WAS PATH LIMITED**, because an agent was
writing in this checkout for most of the session.

## Deployed, and what to open

- **https://positron.studio/patches/** a Circuit pack opened and read. **The
  pack in this repository is NOT published**, deliberately, so the way in on the
  deploy is your own file through the drop target.
  Locally, with the pack: **http://127.0.0.1:8890/patches/** and press
  `open the pack here`. ⚠️ `node demo/server.mjs` must be running.
- **https://positron.studio/wish/** now points at a deployed agent and needs no
  local process. **https://wish.positron.studio** is that agent.
- **https://positron.studio/kit/** has a `DROP TARGET` block at the top of INPUT.

## The one thing to carry forward above everything else

🔴 **THE FIRST FOUR BYTES OF A SESSION FILE ARE NOT A BACKUP TEST, AND THREE
FILES SAID THEY WERE.** `CLAUDE.md`, `plans/plan-patches-page.md` §2.1 and
`research/circuit-soundbank-2026-09-21.md` all published `INIT` as the blank
signature against the owner's `DEMO`. MEASURED on both sides while building the
page: the owner's 32 sessions are **`USER` 22, `DEMO` 7 and `INIT` 3**. Three of
somebody's real sessions carry the exact head published as the blank marker, and
all three are ordinary work at **entropy 0.87 and 86.5 per cent non-zero** with
distinct fingerprints. **A check keyed on the head would have condemned them.**
✅ **THE OTHER THREE NUMBERS ARE FINE AND ARE NOT DELICATE.** Owner: 32 distinct
fingerprints of 32, 0.827 to 1.462 bits a byte, 84.57 to 89.58 per cent non-zero.
The two purchased packs: **ONE fingerprint across all 64 of their session files**,
0.009 bits, 0.07 per cent. Two orders of magnitude.
⚠️ **IT IS THE `User Session` MISTAKE ONE LAYER DOWN.** That one was a name in an
index; this one is a four byte marker inside the file, which looks like content
and is still a label. All three files are corrected.

## What was built

- **`demo/shell/circuit-patch.mjs`**, the decoder that existed once and was not
  kept. 340 addresses **generated** out of Novation's Programmer's Reference with
  `pdftotext -layout` rather than typed, and checked to be 340 contiguous
  addresses with no duplicates before being written out. The two rows that wrap
  across two lines in that document, 91 and 99, are written by hand as bitfields.
  🔴 **IT EXPORTS NOTHING THAT MAKES OR SENDS A MESSAGE, AND THE TEST ASSERTS THE
  ABSENCE.** That is the safety property: `Replace Current Patch` and `Replace
  Patch` differ at offset 6, and the second writes flash.
  ✅ **48/48, AND EVERY FIGURE IN IT WAS PUBLISHED BY AN IMPLEMENTATION THAT NO
  LONGER EXISTS**: 246 of 324 varying parameter bytes, zero bytes above 0x7F,
  `Aciiid` at category 2 genre 3, 37 poly / 22 mono / 5 mono AG, 26 silent second
  oscillators, 22 drive, 9 chorus, 6 distortion, 21 EQ, median attack 2 and
  release 40, 4 with release above 80, and the LFO reach 43 / 13 / 7 / 1. Two
  independent implementations agreeing about one real artefact.
  ⚠️ **ONE FIGURE LOOKED LIKE A DISAGREEMENT AND WAS A DEFINITION.** The research
  says the factory bank *reaches slot 15*; under a depth other than 64 the highest
  is **11**. Both are right: slot 15 carries a destination somebody set at zero
  depth. Both readings are asserted, apart.
- **`demo/shell/drop.mjs`**, a kit module, `open` and never `upload`, naming no
  network API at all. Enter minus leave counter, `preventDefault` on both
  `dragover` and `drop`, a cover that is in the document only during a drag and
  `pointer-events: none` for its whole life, a refusal that says so in words, and
  a file input behind a button. `/kit/` is **112/112**.
- **`/patches/`**, 22/22 locally and 14/14 against the deploy.

## The defects worth carrying forward

🔴 **`/kit/`'s OWN FRAME COUNTER CAUGHT AN `await` I PUT INSIDE ITS MEASURING
WINDOW, ON THE FIRST RUN, IN ONE LINE.** Reading a file is a promise, so the
window was open when a `requestAnimationFrame` callback ran and a frame was drawn
with all five parts laid out at once. That counter exists because **no reading of
the source can see an await**, and three other places on that page already do the
`settle()` / `measure()` dance for the same reason. It worked exactly as written.

🔴 **A PICTURE THAT WAS HONEST AND UNREADABLE, AND THE MEASUREMENT DECIDED IT.**
`/patches/`'s diagram was two machines, a `Browser` and a `Circuit`, with NO arrow
between them, because nothing on the page can reach the instrument. The absence
was the message. Two containers with no link between them land in the same column
and stack, so it filled **27 per cent of its width at 746 px tall**, against
`/crate/`'s 64 per cent at 271 px and `/items/`'s 100 per cent at 226 px, all
measured the same minute. **The layout puts two containers side by side only when
something joins them**, so the honest picture and the legible one were in direct
conflict. It is the signal path of the selected patch now: 100 per cent at 118 px.
⚠️ **AND THE FACT IT CARRIED WAS NOT LOST, IT MOVED TO WHERE IT CAN GO RED.** A
missing arrow was never gradable. The counter on `requestMIDIAccess` is.

🔴 **TWO OF MY OWN ASSERTS MEASURED SOMETHING NEXT TO THE QUANTITY IN QUESTION.**
One required `window.MIDIOutput` to be undefined, which is a fact about the
BROWSER: Chrome defines that constructor whether or not anybody asks for access,
so it went red on a page where nothing was wrong. The other read an empty table's
`textContent` for a column name, and the heading is `hidden` rather than absent,
so it went red on a component doing exactly what it promises.

🔴 **AND A THIRD ASSERTED A STATE NOTHING HAD REACHED YET.** The deploy check read
a sentence that the button press produces, while the check block runs before the
harness presses anything. Red on the deploy, green locally, page correct in both.

🔴 **A RED THAT IS EXPECTED IS A RED EVERYBODY LEARNS TO SKIP.** `/patches/` first
discovered that the pack is unpublished by fetching it and reading the 404. That
reads correctly to a person and took the deploy run red on `no console errors`.
It decides from the origin now, which is a fact about `build.mjs`'s allowlist
rather than a guess about the file.

🔴 **SIX TABLE COLUMNS MADE A PHONE DRAG 240 px.** Cut to five and it is 122, with
page overflow 0 at 390 px and at 1280 and every heading one line at both. `kind`
went rather than another: Novation publish no label table for that byte, seven of
fifteen values were recovered by correlation, and **16 of 64 rows would have shown
a bare number**.

## What is open

1. **`origin/main`**, above, and the command in the last handoff was wrong. This
   is the only thing here needing a person rather than a decision.
2. 🔴 **THE PARAMETER PANEL ON `/patches/` IS NOT BUILT.**
   `plans/plan-patches-page.md` §2 asked for a panel showing a pressed patch's
   parameters grouped by `circuit-cc.mjs`'s sections, and what shipped instead is
   the diagram, because the ask that arrived was *"table plus diagram"*.
   `patchFields()` and `macroLegs()` are built and tested and the page uses the
   first only for a hover count. **The panel is the obvious next thing.**
3. **The samples half of a pack is untouched.** 64 WAVs, 48 kHz 16 bit mono, 0.12
   to 2.00 s, 53.4 s in total. `plans/plan-circuit-samples.md` owns it and wants a
   drum machine.
4. 🔴 **`/wish/`'s PRODUCTION EXPOSURE IS REAL AND IS WRITTEN DOWN RATHER THAN
   SOLVED.** The `Origin` allowlist stops a stray page and a crawler and stops
   nothing else: `curl` with the right header walks through. The rate limit is
   **per data centre** and measured approximate in both directions, one burst
   seeing its first 429 at request 21 and another letting 40 through. One press is
   about **$0.00034** and the free daily allowance covers roughly **320**; the
   worst case under the 1 MB cap is about **$3.20 an hour** from one address in
   one location. ⚠️ If that matters, the next layer is a shared secret or Access.
5. ⚠️ **ONE SABOTAGE OF EIGHT DID NOT BITE ON `/wish/`** and the branch it was
   meant to cover is now graded in `demo/shell/instruments-test.mjs` rather than on
   the page, because `/wish/`'s three instrument desk cannot raise the ambiguity.
6. **ESTONIAN** is still deliberately not scheduled, and the reason is at the top
   of `BACKLOG.md`: `STOP` is a closed set of English verbs and it carries all of
   the matcher's precision.
7. **`vad_filter` is unmeasured**, unchanged from the last two sessions.
8. 🔴 **NO PAGE IS GRADED ON A PHONE AND `verify.mjs` STILL RUNS AT 756 px ONLY.**
   `/patches/` was measured at 390 with a throwaway probe, which is the same
   arrangement the last session flagged as the largest blind spot. Three unpriced
   options are in `plans/plan-panel-component.md`.
9. **The 32 user sessions off the Circuit**, asked for four sessions ago.
   `/patches/` now makes it cheap to CHECK such a backup and does nothing to make
   one.
10. 🔴 **`/bay/` IS STILL UNHEARD** and still shows `here:` port ids in its link
    line. Both carried over unchanged.
11. **The remaining `/evo/` and `/shape/` asks in `BACKLOG.md`**, collected and
    not worked. The C3 one has an instrument half: power-cycle the keyboard first,
    because the manual's non-volatile list does not include transpose.
