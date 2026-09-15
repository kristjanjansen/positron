# looks

Every picture `/videoradio/` has had, kept and reachable.

## Pick one

    https://positron.studio/videoradio/?look=<name>
    http://127.0.0.1:8890/videoradio/?look=<name>

Or use the LOOK row in the page's own control bar. All of them side by side:
`http://127.0.0.1:8890/demo/videoradio/looks/compare.html`

| name | what it is |
|---|---|
| `slab` | The first answer to the New Order reference. Stacked scanlines, white on black, height read from the drawn field alone. 72 rows. |
| `plot` | The grain buckets became the height, so the ridges got real shape, and a standby wave arrived. Still white. |
| `vista` | Valleys cut below the baseline, hard corners on every facet, a lower eye, phosphor blue. **The working look.** |
| `ridge` | The same, moving: rows five times faster, a sway per row, amplitude breathing on the grain clock. |
| `pulsar` | Folded about a horizon, so the terrain has a reflection and the halves moire. |
| `deep` | 132 rows crowded toward the horizon by perspective rather than by a curve. |

## The protocol

**`quartz` is the one being worked on. Everything else is kept, not maintained.**

🔴 **Before changing the working look in a way that changes how it looks, copy
its entry to a new name.** The table lives in `demo/videoradio/index.html` as
`LOOKS`. Copying an entry is four lines and it is the only thing that has ever
worked.

**A name is a noun for what it looks like.** Never a number, never a date.
Somebody choosing between two of these is choosing between two pictures, and
`v3` tells them nothing about either.

⚠️ **DO NOT SAVE A WHOLE PAGE.** There used to be a `pulsar.html` here, a
157 KB copy of the entire demo, and it was deleted rather than kept: a saved
page also carries that hour's audio graph, layout and controls, all of which
have moved on, so it cannot be copied back over the live one. Worse, restoring
just its shader block twice brought back a picture that compared as identical
while a constant OUTSIDE the block differed, which is the failure the table
exists to prevent.

## Why this exists

Going back failed four times in one evening, each time differently:

- The kaleidoscope was built, shown, replaced within the hour, and **never
  copied**. It exists in no file.
- Restoring a shader block from a saved page brought back a block that compared
  as identical while `ROWS` sat **outside** it at 132 against the saved 46. At
  that count the lines merge into blobs.
- The same restore silently dropped the **corner sharpening**, which turned out
  to be the thing actually being looked for. It was gone for half an hour while
  row counts were adjusted to compensate for something else entirely.
- A full saved page carries that hour's audio and layout too, which have since
  moved on.

A constants table fixes all four, on one condition: **anything that changes the
shape of the picture rather than its numbers has to become a flag here**, or it
cannot be archived. That is why `facet`, `bucket`, `valley`, `mono`, `keep`,
`stretch` and `swellY` sit beside the row count.
