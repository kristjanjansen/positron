# Kit lessons: drum pattern

<a id="header"></a>

## `drum-pattern.mjs` header

One drum pattern as plain data, shared by `/devices/drums/` and the board's sequencer (`plans/plan-pi-sequencer.md` §4.3): `{ v: 1, name, bpm, steps: 16, rows: [{ voice, steps: '1000100010001000', mute }] }`. Rows name General MIDI voices (`GM_VOICES` keys), never device notes; a name that is not one is refused when the pattern is loaded, with the list. One character a step, 0 or 1 (accents are not built). `notesAt(pattern, step)` is the only place a voice becomes a note.

Named `drum-pattern.mjs` because `demo/shell/pattern.mjs` is the video test pattern (the burned clock row). On 2026-10-15 the first draft of this file was written over that one by name; it was restored from HEAD before anything shipped or was committed.
