# `/circuit/`'s sending half, lifted out 2026-09-21

*"rm midi out stuff, keep it handy. lets focus on in"*. This is the whole of it,
removed from `demo/circuit/index.html` and kept because it worked and because
the thing it was built around is worth not re-deriving.

## What it did

The page drove the hardware with **note on, note off, and MIDI Start and Stop**,
and that was the entire list.

- **Tracks armed a destination.** `Syn1` channel 1, `Syn2` channel 2, the four
  drums channel 10 at notes 60, 62, 64 and 65. The two sidechain buttons armed
  nothing, because a sidechain is not something to play notes at.
- **A pad press sent a note and a note off 120 ms later**, because a pad here is
  a button rather than a key: `pad.mjs` publishes a press, not a press and a
  release, so a held pad would have left a note sounding on the hardware with
  nothing on the page able to stop it.
- **`►` sent Start and Stop.** Never confirmed to do anything: this Circuit was
  measured sending its own clock continuously, which makes it the master and
  entitled to ignore both.

## 🔴 The part worth keeping, which is the refusal

`no record` was not a preference about a button. It was the constraint the whole
sending half was built inside, for a device with **no factory reset**.

**It is an allowlist, not a disabled button.** A button switched off is one edit
away from being switched on and the edit looks harmless. What stopped a record
arming was that `send()` had no path for a control change, a program change or
SysEx, on any channel. **A record command could not be expressed**, so deleting
the `disabled` flag still could not produce one.

And the guard was **fired on purpose** rather than reasoned about: the check
handed it four shapes that could touch a recording or move a patch and asserted
all four bounced, with a negative control beside it asserting that notes and
transport really did go through. Without that second half, a guard that refused
everything would have passed while making the page inert.

## What was never measured, and still is not

Nobody ever heard it play. Every assert graded **this page's side of the wire**:
what was sent, what was refused, which track was armed. A counter on the sending
side is not evidence the device did anything.

- Whether the synths answer notes on channels 1 and 2.
- Whether the drums answer 60, 62, 64 and 65 on channel 10.
- Whether Start is obeyed at all.
- The pad to note map was a **choice**, not a measurement: chromatic from 48,
  bottom row lowest, because three notes out of thirty two have ever been seen.

## Putting it back

`send.js` is the block verbatim, and it went immediately after `guard(d)` and
**above every control it serves**. That position is not tidiness: below them,
`DEST[i]` read from a pad's own `title` at build time threw a temporal dead zone
error and the whole page died at mount.

Four call sites went with it: `onPress: () => arm(i)` on the track pads,
`onPress` in the pad grid's factory, `disabled`/`onPress` on the side pads for
record and play, and the output lookup inside `open()`. The readout was four
cells, `armed` / `output` / `sent` / `playing`, and the page has none now.
