# plan-instrument — one instrument, two ends, shared parts

Status: **not started.** Written 2026-09-10, out of building `rig/pro-instrument`
beside the existing `instrument` demo and finding they share a subject and almost
no code.

Read `CLAUDE.md`'s conventions first; this plan owes them deference, especially
the one about shared modules.

---

## 0. One line

There are now **two instruments in this repo that do not know about each other**:
`demo/instrument/` (play here, hear it in another browser) and
`rig/pro-instrument/` (play here, a machine in the next room makes the sound and
sends it back). They duplicate the key mapping and the note plumbing, disagree
about which keys are which notes, and only one of them can be played with a
mouse or a finger.

The work is to make the **parts** shared and leave the **claims** separate,
because they are different claims and collapsing them would lose both.

---

## 1. What is actually duplicated, counted rather than assumed

| piece | `demo/instrument` | `rig/pro-instrument` | verdict |
|---|---|---|---|
| MIDI in/out | `shell/hardware.mjs` | its own `requestMIDIAccess` | **the shell already owns this** |
| synth voices | `proto/looper/synth.mjs` (3 callers) | a hand-rolled triangle | shared already, wrong address |
| key → note | `{a:0,w:1,s:2,…}`, chromatic, 13 keys | `asdfghjk`, diatonic, 8 keys | **two mappings, no reason** |
| on-screen keys | **none — typing only** | hand-built `#keys` div | **neither is shared** |
| readout | `d.readout` + `shell.css` | a hand-rolled CSS table | divergent |
| transport switch | — | segmented `#cases` row | new, and worth keeping |

Two things stand out. **`hardware.mjs` already exists and already does the hard
part** — one gesture buys sound and MIDI, and the capability is reported rather
than thrown. `pro-instrument` re-implemented a worse version of it because it was
written as a rig, outside `demo/`, where the shell was not in reach.

And **neither page has a reusable keyboard**. `instrument` has no on-screen keys
at all, so it cannot be played on a phone or by a visitor who does not know the
mapping; `pro-instrument` grew eight buttons in a `<div>` because it needed
something to press. That is the component to build, and it is the one the user
asked for.

---

## 2. The decision everything follows from

**Share the INSTRUMENT, not the DEMO.**

The two pages answer different questions and both are worth having:

- `instrument` asks *what crosses the wire when two people play together* — and
  its answer is that **note numbers cross, raw MIDI never leaves the page**, so
  the relay carries music rather than a device protocol.
- `pro-instrument` asks *how late is the sound when the instrument is somewhere
  else* — and its answer is a table of four transports, 58 ms at best.

Merging them into one page would force one paragraph to make both claims, and
`CLAUDE.md`'s rule is one paragraph of three or four sentences. The pages stay
two. What becomes one is everything below the claim: the keys, the mapping, the
voices, the MIDI.

**The test for anything proposed as shared**: can both pages call it, today,
without a flag that selects between two behaviours? A parameter that switches
which demo you are is not a shared component, it is two components in a
trenchcoat.

---

## 3. `shell/keyboard.mjs` — the component the user asked for

One module, one look, both pages, and touch works.

```js
createKeyboard(host, {
  from = 60, keys = 13,          // C4 up; 13 gives a full octave with both ends
  map = QWERTY_CHROMATIC,        // key -> semitone; the ONE mapping
  onDown(note, how),             // how: 'key' | 'pointer' | 'midi'
  onUp(note, how),
})
```

Rules it has to obey, each from something already paid for:

- **Black and white keys, drawn as a keyboard.** `pro-instrument`'s eight equal
  grey buttons cannot show that `w` is a black key, which is why its mapping
  drifted diatonic — the picture could not represent the chromatic one. Shape
  first, then the mapping can be the real one.
- **Pointer AND key events, with one code path.** `pointerdown`/`pointerup` (not
  `click`) so a held finger is a held note, and so the same handler serves a
  trackpad, a touchscreen and the typing keys.
- **The pressed state comes from the NOTE, not the input.** A note arriving over
  MIDI, or from the other peer, lights the same key. `instrument` already hunts
  `Object.keys(KEYMAP).find(...)` to do this by hand in two places; the module
  owns it and the pages stop searching.
- **`preventDefault` on the mapped keys only.** Typing `s` must not scroll, and
  everything unmapped must still reach the page.
- **No note-off is ever assumed.** A pointer leaving the element, a blur, a
  `pointercancel` all release. The looper's lesson is that "no stuck notes" comes
  from the reducer rather than the wrap callback — here it comes from the module,
  never from the caller remembering.

**Where it must be visible**: both pages, on day one. `demo/shell/pattern.mjs`
was written to be the one test picture and was imported by a single caller that
could not connect, while four demos drew their own (LESSONS #30). A keyboard with
one caller is the same mistake with a different file name.

---

## 4. The other three moves, in order of how much they buy

### P1 — `pro-instrument` uses `hardware.mjs` for MIDI

It re-implements `requestMIDIAccess` and picks a port by substring. `hardware.mjs`
already does that, reports the capability rather than throwing, and is the thing
`verify.mjs` knows how to reach. Delete the local copy.

**Done when** `synth.html` has no `requestMIDIAccess` in it and still logs which
port it found.

### P2 — `synth.mjs` moves to `demo/shell/`

`createVoices` has three callers (`demo/instrument`, `demo/looper`,
`proto/looper`) and lives in `proto/looper/`, which is a prototype directory.
`build.mjs` enumerates `demo/shell/` and refuses an import with no deployed file;
a shared synth belongs where that guard can see it. `pro-instrument` becomes the
fourth caller and loses its hand-rolled oscillator — which matters beyond tidiness,
because that oscillator's 450 ms decay is what let the onset detector re-arm, and
Drift's sustain silently broke the measurement until the spacing was widened.

**Done when** four pages import one synth and `proto/looper/synth.mjs` is a
re-export, or is gone.

### P3 — one readout, `d.readout`

`pro-instrument` hand-rolls its table because it is not a demo. If P4 happens it
gets `d.readout` for free; if it does not, it should at least use `shell.css`
rather than a private copy of the same greys.

### P4 — does `pro-instrument` become a demo?

**Argued, not assumed.** For:

- it is the most interesting thing in the repo right now — a real instrument in
  another room at 58 ms — and it is invisible, sitting in `rig/` outside the
  413-assert suite;
- everything it does (a strip of transports, a measured readout) is what the
  demos are for.

Against, and these are real:

- **it needs a second machine.** Every other demo runs from one browser. A demo
  whose subject cannot appear for a visitor is a page that reads as broken, and
  the suite would assert nothing on the leg that matters — which is exactly how
  `moq` and `ladder` asserted NOTHING for weeks behind a plausible excuse
  (LESSONS #29);
- **the synth end needs permissions a visitor cannot grant** — a MIDI port, an
  audio input, a browser launched into a GUI session.

**The shape that resolves it**: ship the PLAYER as a demo with a
**self-play fallback** — with no peer, it synthesises locally and says so in
words, and the transport table shows what a second machine would add. Then the
suite exercises the keyboard, the mapping and the readout on one machine, and the
two-machine numbers stay in `rig/` where they are honest about needing a rig.

Do not ship it as a demo that is dead without a second Mac.

---

## 5. Traps

- **A shared module with one caller is a claim, not a unification.** Grep the
  importers before calling anything shared (LESSONS #30).
- **A flag that selects which demo you are is not reuse.** §2.
- **`verify.mjs` presses `.d-controls button` in document order.** A keyboard
  built in the page body is invisible to it (LESSONS #19), and moving an existing
  control to make room reorders every press (#41). Put the keys where the harness
  is not, and keep the *controls* where it is.
- **Assert counts must not fall.** Diff per-demo counts after every step; a
  silently-dropped branch is how four asserts went missing while the suite read
  green (#13).
- **Two key mappings will fight.** Pick the chromatic one — it is the one a
  keyboard picture can show — and change `pro-instrument`'s eight buttons rather
  than flattening `instrument` to a scale.
- **Do not let the on-screen keyboard become a second source of truth for what
  is playing.** Lit keys come from note events, never from the press that caused
  them, or a note arriving over MIDI will not light and a locally-pressed key
  will stay lit after the note stops.

---

## 6. Definition of done

1. One `shell/keyboard.mjs`, imported by both pages, playable with a mouse, a
   finger, the typing keys and a MIDI keyboard, with the same mapping on both.
2. `pro-instrument` has no MIDI code and no synth code of its own.
3. `createVoices` has one home, in `demo/shell/`, with four callers.
4. Per-demo assert counts unchanged, or changed on purpose and diffed.
5. Whatever ships as a demo is honest with one machine, and says in words what a
   second machine would add.
