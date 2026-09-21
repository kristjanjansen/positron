# plan-patches-page

**A page that opens a Circuit pack and says what is in it, and a drop target
that opens a file without sending it anywhere.** Asked 2026-09-21:
*"do lightweight planning on patch demo (inclu global dragdroppable upload)"*.

Lightweight on purpose. Everything hard has already been measured and lives in
files named below; what is missing is a page and one kit module.

## ✅ BUILT 2026-09-21, and three things came out differently

Asked for as *"Patch demo: make it"*, then *"So the patcbay visualiser table plus
fiagram"*. Live at **https://positron.studio/patches/**.

- `demo/shell/circuit-patch.mjs` and `circuit-patch-test.mjs`, **48/48**. The 340
  address table is GENERATED out of the Programmer's Reference with
  `pdftotext -layout` rather than typed, and checked to be 340 contiguous
  addresses with no duplicates before it was written out.
- `demo/shell/drop.mjs` and its `/kit/` block, four asserts, two of them negative
  controls. `/kit/` went to **112/112**, and its own frame counter caught an
  `await` put inside its measuring window on the first run.
- `/patches/`, **22/22 locally and 14/14 against the deploy**.

**What came out differently from this plan:**

1. 🔴 **THE DETAIL PANEL IS THE DIAGRAM.** §2 asked for a panel of parameters
   grouped by `circuit-cc.mjs`'s sections and §5 guessed a table. The ask that
   settled it was *"table plus diagram"*, so pressing a row repaints the signal
   path under `How it works` with that patch's own waves, filter and envelope.
   What a panel would have carried is on the row's hover, including how many of
   the 340 parameters are off their default. **A parameter panel is still
   unbuilt and is worth having.**
2. 🔴 **THE PICTURE WAS DRAWN TWICE AND THE MEASUREMENT DECIDED IT.** The first
   was two machines, a `Browser` and a `Circuit`, with NO arrow between them
   because nothing here can reach the instrument. Two containers with no link
   between them land in the same column and stack: it filled **27 per cent of its
   width at 746 px tall**, against `/crate/`'s 64 per cent at 271 px and
   `/items/`'s 100 per cent at 226 px. The signal path fills 100 per cent at
   118 px. **The fact the old picture carried is not lost, it moved to where it
   can go red**: the caption, and an assert over a counter on
   `requestMIDIAccess`. A missing arrow was never gradable.
3. 🔴 **THE PACK IS NOT PUBLISHED AND THE PAGE DECIDES THAT FROM THE ORIGIN.**
   §2 says the page opens `New Pack.circuitpack` on a press, which it does on a
   checkout. `workers/view/build.mjs` copies an allowlist and that file is not on
   it, deliberately: it holds 32 of somebody's real sessions. The first build
   discovered the absence by fetching and took the deploy run RED on
   `no console errors` with two 404s, which is a red everybody learns to skip.

⚠️ **AND §2.1's FOURTH NUMBER WAS WRONG**, which is written into that section.

## 1. What already exists, so nothing here is rebuilt

| piece | where | state |
| --- | --- | --- |
| a `.circuitpack` reader | `demo/shell/unzip.mjs` | **13 asserts, nothing vendored**, in the browser |
| the 98 live parameters | `demo/shell/circuit-cc.mjs` | 16 asserts, graded against this desk |
| the patch format | `plans/plan-circuit-editor.md` | measured byte for byte against the published one |
| the census of 128 patches | `research/circuit-soundbank-2026-09-21.md` | 514 lines |
| a table with keyboard navigation | `demo/shell/table.mjs` | throws unless exactly one column grows |
| a segment display | `demo/shell/segment.mjs` | 34 asserts, two schemes |
| something to read on arrival | `New Pack.circuitpack`, repo root | **3.3 MiB, tracked on purpose** |

🔴 **THE DECODER IS THE ONE THING THAT EXISTS AND IS NOT KEPT.** The soundbank
analysis built one, graded it against the published `patch_0` (246 varying
fields of 324, exact), and it lived in a scratchpad. **Rebuild it as
`demo/shell/circuit-patch.mjs` with its own no-browser test**, or this page is
the third place that knows the format.
⚠️ And grade it the same way: against `patch_0` from the owner's own pack, not
against a number derived from the same formula the decoder implements. That is
the Csound lesson, which was 22/22 green for months with two real defects.

## 2. The page: `/patches/`

**One sentence:** *Open a Circuit pack and see what its patches are made of.*

- A **table**, one row per patch: name, category, the oscillator waves, the
  filter type, whether the LFOs reach anything, polyphonic or mono.
- Press a row and a **detail panel** shows that patch's parameters, grouped by
  the sections `circuit-cc.mjs` already publishes.
- It opens `New Pack.circuitpack` on a **press**, never on load: 3.3 MiB is a
  visitor's bandwidth and the self-check rule is absolute.
- 🔴 **IT SENDS NOTHING. NOT ONE BYTE.** No Web MIDI, no `requestMIDIAccess`,
  no output. A page that could send a pack is one press from destroying flash on
  an instrument with no factory reset, and `New Pack.circuitpack` is the only
  backup of that flash. `/shape/`'s wall is the model: one function that turns an
  intention into bytes, and here that function does not exist at all. Assert it.

### 2.1 🔴 The feature that earns the page: it says when a pack is blanks

`research/circuit-soundbank-2026-09-21.md` measured a purchased pack whose 32
sessions were **empty**: 1 distinct fingerprint of 32 against the owner's 32 of
32, entropy 0.01 bits a byte against 0.83 to 1.46, 0.1 per cent non-zero against
84.6 to 89.6. **And all three packs on
this machine display as `*New Pack` in Novation Components**, so the only backup
and the two that would erase it are three identical rows.

So the page prints, per session: **distinct fingerprints, entropy and non-zero
share.** That is three cheap numbers that separate a backup from a wipe, and it
is the check that would have caught the purchased pack before anybody pressed
`Send to Circuit`.

🔴 **THIS SAID FOUR NUMBERS AND THE FOURTH WAS THE FIRST FOUR BYTES, AND IT IS
WRONG. CORRECTED 2026-09-21 BY MEASURING BOTH SIDES.** The owner's 32 sessions
are **`USER` 22, `DEMO` 7 and `INIT` 3**, so three real sessions carry the head
this plan published as the blank signature, at entropy 0.87 and 86.5 per cent
non-zero with distinct fingerprints. The head is still SHOWN on the page, in its
own column, because a reader should be able to see for themselves that it is the
same on both sides. It decides nothing.
⚠️ **A NAME IS NOT EVIDENCE**, which this project got wrong once already about
these very sessions: the ones called `User Session` were implied to be blanks and
measurement said 32 distinct of 32, none empty. Fingerprint content.
⚠️ **AND ASK WHAT THE DENOMINATOR IS.** A session file is four fifths `0xFF`
erasure, and a statistic over the whole artefact measures the erasure: 44,071
high bytes of 53,248 was published here as *not seven bit* when the real payload
was 9,180 bytes of which **two** were above 0x7F.

## 3. The drop target: `demo/shell/drop.mjs`

**A kit module. Drop a file anywhere on the page and it opens.**

🔴 **IT IS `open`, NOT `upload`, AND THE WORD MATTERS.** Nothing leaves the
machine. `FileReader` to an `ArrayBuffer`, in the tab, and no `fetch`. A
purchased soundbank lives in `purchased/` precisely because it is not ours to
publish, and a control called *upload* invites somebody to build the thing the
gitignore exists to prevent. The label a visitor reads says **open**.

```
createDrop({ accept: ['.circuitpack', '.syx'], onOpen(files), says })
  -> { el, destroy, opens }   // `opens` counts, so a visit opening nothing is an assert
```

Five things to get right, four of them measured elsewhere in this repository:

- 🔴 **`dragleave` FIRES ON EVERY CHILD, so a boolean flickers.** Keep a counter
  of enter minus leave, or the cover blinks as the pointer crosses a table row.
- 🔴 **`preventDefault` ON BOTH `dragover` AND `drop`, ON THE DOCUMENT.** Without
  the first, the drop never fires; without the second, the browser NAVIGATES TO
  THE FILE and the page is gone with whatever was on it.
- ⚠️ **THE COVER IS `position: fixed; inset: 0` AND IS OVER THE CONTROLS**, which
  is the `/weight/` and `/floor/` lesson: a faux full-screen cover sat over the
  row holding the button that got you out. So it is only present while a drag
  is in flight and is `pointer-events: none` otherwise.
- ⚠️ **A REFUSED FILE SAYS SO IN WORDS AND IN THE LOG.** Dropping a JPEG must
  read as *this is not a pack*, never as nothing happening.
- ⚠️ **AND IT TAKES A KEYBOARD PATH TOO**, because a drop target that is the only
  way in is a page somebody cannot use. One `<input type="file">` behind a
  button, same handler.

⚠️ **AND IT GOES AT THE TOP OF `/kit/` IN THE `INPUT` TAB**, uppercase heading,
which is an instruction and not a preference. The newest block marks its own tab
with nothing typed, so the mark follows by itself.

## 4. Order, and the first step is not the page

1. `demo/shell/circuit-patch.mjs` plus its no-browser test, graded against
   `patch_0` from the owner's own pack.
2. `demo/shell/drop.mjs` plus a `/kit/` block. **Shared, so it lands before the
   page**, which is the standing rule about anything shared going first and once.
3. `/patches/` reading `New Pack.circuitpack` on a press.
4. The session fingerprint panel from §2.1.
5. `manifest.mjs`: `hardware` group, `built: true`, a one-sentence `one` line
   that is the same string as the page's `what`.

## 5. What this plan does not settle

- **Whether a pack's 64 samples are worth drawing.** They are 48 kHz 16 bit
  mono, 0.12 s to 2.00 s, 53.4 s in total, and drawing a waveform is a different
  page. `plans/plan-circuit-samples.md` owns that question.
- **Whether the detail panel should use the segment display.** It would look
  right and it is a picture of a number, but 52 parameters is not a readout and
  the honest answer is probably a table.
- **Whether `/patches/` and `/shape/` should be one page.** They are opposite
  halves of the same object: one reads flash and cannot send, the other sends
  and cannot read. Merging them puts a send path on a page that opens somebody's
  only backup, which is an argument for leaving them apart.
- **Nothing here has been built or measured.** Every number quoted is from a
  file named above.
