# plan-patches-page

**A page that opens a Circuit pack and says what is in it, and a drop target
that opens a file without sending it anywhere.** Asked 2026-09-21:
*"do lightweight planning on patch demo (inclu global dragdroppable upload)"*.

Lightweight on purpose. Everything hard has already been measured and lives in
files named below; what is missing is a page and one kit module.

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
84.6 to 89.6, first four bytes `INIT` against `DEMO`. **And all three packs on
this machine display as `*New Pack` in Novation Components**, so the only backup
and the two that would erase it are three identical rows.

So the page prints, per session: **distinct fingerprints, entropy, non-zero
share, and the first four bytes.** That is four cheap numbers that separate a
backup from a wipe, and it is the check that would have caught the purchased
pack before anybody pressed `Send to Circuit`.
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
