# Yoshimi (concept remote/000), archived 2026-10-13

Asked: *"discard yoshimi. with possiblity to do dual setup in future (pi and
browers, interlink). arhive demos using it"*. Yoshimi left the Raspberry Pi the
same day, so this page could no longer sound. Its last version is kept whole,
313 lines, at `archive/concepts/remote-000-index.html` (it was
`demo/concepts/remote/000/index.html`). `/concepts/remote/000/` is a 404 with
no forwarding, and the gap stays: remote/010 Circuit was not renumbered.

`archive/yoshimi/README.md` says how to bring Yoshimi back on the Pi and how a
browser twin would pair with it. This page is the one to start that pair from.

## What it did

- **The keys and two knobs played Yoshimi on the Pi in `studio-1`** over the
  relay, through `demo/shell/board.mjs`, and Yoshimi's sound came back down the
  same socket into a playout in the tab.
- **One patch, AddSynth Morph**, bank 115 program 32
  (`Will_Godfrey_Companion/0033-AddSynth Morph.xiz`), selected with
  `voice.select` after `audio.start {source: 'yoshimi'}`, given 900 ms to load.
- **Two knobs, the measured ones**: CC 74 the part's filter cutoff (home 127)
  and CC 71 its resonance (home 64), sent through `cc-adapter.mjs`'s gate as
  `ctl.set`. Yoshimi does not use the General MIDI controller map, which is why
  7, 11, 75, 76, 77, 78 and 1 were left out.
- **A scope** full width, an analyser on the board's playout.
- **Readouts on top**: key to sound, its median, the round trip and the cushion,
  in ms.
- **A patchbay** of the page's own nodes (keyboard, the two knobs, waveform,
  speakers) and the Pi's `pi-1:yoshimi:midi-in` and `pi-1:yoshimi:audio-out`.

## What it opened

Nothing on a visit. The board and its relay socket were made on the play
press. Under `?selfcheck=1` it sent nothing to the shared board unless
`?board=1` was added, the gate `/knobs/` used.
