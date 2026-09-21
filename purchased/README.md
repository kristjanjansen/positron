# purchased

**Content somebody paid for. It is not ours to publish, and nothing in here is
committed.** Made 2026-09-21 on instruction: *"i purchased them. do not git
them"*, then *"make a dir for such things"*.

`.gitignore` ignores `purchased/*` and un-ignores this one file, so a fresh
clone sees a directory holding only this explanation. That is deliberate: an
ignored directory with nothing tracked in it **does not exist in git at all**,
and the next person would make a second place for the same thing.

## What goes here

Anything bought, licensed, or otherwise somebody else's to sell: sample packs,
soundbanks, patch libraries, fonts, sample libraries. If in doubt about whether
a file may be redistributed, it goes here.

## What does NOT go here

🔴 **`New Pack.circuitpack` in the repository root is the opposite case and is
deliberately TRACKED.** It is the owner's own backup of the Novation Circuit on
this desk, it is somebody's only copy, and `CLAUDE.md` records at length why it
must never be deleted. **Ours to keep, theirs to sell.**

⚠️ And recorded material this project holds rights to lives in R2 rather than
here: the MIMproject recordings and pictures are at
`positron-station.../media/mimproject/`, and `demo/resources/mimproject.json`
is the manifest. Those are addressed, not stored.

## Reading a `.circuitpack` or a `.syx`

`demo/shell/unzip.mjs` opens a `.circuitpack` with nothing vendored, graded at
13 asserts. `plans/plan-circuit-editor.md` has the patch format measured byte
for byte against the published one, and `plans/plan-circuit-patches.md` has the
procedure for getting patches on and off the instrument, including the list of
things that destroy them.

🔴 **A `Replace Patch` SysEx writes flash on a device with no factory reset**,
and it differs from the harmless `Replace Current Patch` by **one byte at offset
6**. Nothing in this repository may send either. Read these files; do not play
them at the instrument without reading that plan first.
