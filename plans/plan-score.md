# plan-score — one normalized score, three languages

Status: **not started.** Written 2026-09-07, out of the `03 nest` rework and a
reading of `04 score`. Supersedes nothing; `plans/plan-timeline.md` §8 owns quotation
semantics and this plan owes it deference.

---

## 0. One line

There is already a score VALUE (`timeline/score.mjs`), a Csound COMPILER
(`timeline/csound.mjs`), and a nest that plays quotations (`timeline/nested.mjs`).
What is missing is the **container** — one JSON document that can carry a
Csound score, a MIDI score and our own rows without flattening any of them, and
that keeps structure as structure so a loop stays one line played three times
rather than three lines.

`04 score` becomes the demo of that container: a timeline on top, the score
below it, and the line that is playing lit up as it plays.

---

## 1. The one design decision everything else follows from

**Normalize the ENVELOPE. Never normalize the PAYLOAD.**

A Csound note is `i 1 0.0 2.0 8000 440` — instrument, start, duration, then
whatever p-fields that instrument reads. A MIDI note is channel, number,
velocity. One of ours is a `kind` and an arbitrary payload. A format that made
these one vocabulary would have to invent a lowest common denominator, and that
denominator is a lie about all three: p5 is not velocity, velocity is not p5,
and "note number" means nothing to an instrument that reads a frequency.

So the container standardises only what is genuinely common — **when, how long,
what it belongs to, and where it came from** — and carries the rest verbatim,
tagged with the language it was written in. This is the MCAP shape the project
already listed as prior art worth stealing: a container that carries typed
messages without claiming to understand them.

The test for any proposed field: *could a Csound p-field, a MIDI velocity and
one of our payloads all answer it without one of them lying?* If not, it belongs
in the payload, not the envelope.

---

## 2. Shape

```jsonc
{
  "v": 1,
  "id": "vclick-demo",
  "unit": "beat",                        // the time unit of every `at`/`dur` below
  "tempo": [[0, 120], [30, 90]],         // beat→bpm MAP, not a scalar
  "parts": {
    "verse": {
      "lang": "csound",                  // csound | midi | positron
      "rows": [
        { "id": "r1", "at": 0, "dur": 2, "kind": "note",
          "p": [1, 0, 2, 8000, 440], "line": 4 }
      ]
    }
  },
  "uses": [
    { "part": "verse", "at": 0,   "in": 0, "out": 8 },
    { "part": "verse", "at": 12,  "in": 0, "out": 4, "repeat": 3 }
  ]
}
```

- **`tempo` is a map and never a number.** `csound.mjs` already computes the
  beat→ms integral: Csound interpolates SECONDS PER BEAT linearly in beat, so a
  ramp is the trapezoid of `60/tempo` (verified against csound 6.18 — this line
  claimed a closed-form logarithmic integral until 2026-09-09, which was wrong).
  The map is what lets a client derive "where are we now" without asking a
  server — one of the three failures the Csound compiler was written to fix.
- **`unit: "beat"` is mandatory even for languages that have no tempo.** A MIDI
  score gets `tempo: [[0, 60]]`, at which one beat is one second, and it SAYS SO
  rather than quietly meaning milliseconds. Csound's own default is 60 bpm for
  the same reason, which is why so many scores read as if p2 were seconds.
- **`uses` is the structure, and it is `nest.add()` in JSON.** Each entry is a
  `quotation()` from `score.mjs`: a `part` named by identity, an `at`, an
  `in`/`out`, and optionally `repeat`.
- **`in`/`out` may be MARKS, not numbers** — `{"mark": "chorus-3"}`. This is
  `score.mjs`'s second property and the reason any of this matters for archival
  work: when a source is re-cut, numbers are silently wrong and marks are
  silently right. Csound already has the syntax (`m name`), so the compiler has
  somewhere to put them.

### How `03`'s loop is represented

Exactly as `03` already plays it, and this is the point:

```jsonc
"uses": [
  { "part": "recording", "at": 1000, "in": 1000, "out": 4000 },
  { "part": "recording", "at": 5500, "in": 0,    "out": 1800, "repeat": 3 }
]
```

**Two lines, not four, and the second is not three lines.** The loop does not
appear in the rows at all; it is one entry with a count. That is the whole
argument against a flat event list, and it is what the demo must make visible:
when the loop plays, **the same line lights up three times.** A format that
expanded it would light three different lines and the reader would learn the
wrong thing.

---

## 3. The demo

Timeline on top, score below, and the currently-playing row lit.

1. **The strip** carries the same three lanes `03` settled on: the parent's own
   rows, the `uses` as slices, and where the part's own rows land inside each
   use.
2. **The score** renders as JSONL — header line, then one line per row, then one
   line per use. One row per line is what makes "the line playing now" a
   highlight rather than a search.
3. **Highlighting** comes from the deck, never from a timer: each compiled row
   carries the id of the score line it came from, and `onFire` lights it. A
   played-but-past line stays dimly marked, so the score reads as a trail rather
   than a blink — the same reasoning that made `01`'s marks keep their colour
   after the playhead passes.

### JSON or JSONL — both, with one of them authoritative

They answer different needs and the plan should not pretend one wins:

| | canonical JSON | JSONL |
|---|---|---|
| byte-identical round-trip | **yes** (`score.mjs` sorts keys) | not on its own |
| diffable in git | whole-document | **line-by-line** |
| addressable while playing | needs a path | **line number** |
| appendable / streamable | no | **yes** |

**Rule: canonical JSON is authoritative; JSONL is a deterministic VIEW of it.**
The demo asserts the view round-trips back to a byte-identical canonical
document. Two representations that can disagree is exactly the defect this
session kept finding; the assert is what stops it being one.

---

## 4. Phases

### P1 — the container, and Csound into it

`timeline/score.mjs` gains `scoreDoc({parts, uses, tempo, unit})` and
`loadScoreDoc(doc, resolve)`. `csound.mjs` gains an emitter that produces a
`part` rather than a bare item list — it already computes everything needed
(`{tempo, items, sections, repeats}`), and `repeatsAsQuotations()` already turns
`n` statements into quotations, so this is mostly a re-shaping.

**Done when** a Csound score compiles to a document, the document plays, and
the document round-trips byte-identically.

### P2 — MIDI in the same container

A MIDI file (or a live capture from `02`'s input lane) becomes a part with
`lang: "midi"`. Its rows carry `{ch, note, vel}` and a duration; `unit` is beat
with `tempo: [[0,60]]` unless the file carries a tempo map, in which case use it.

**Playback goes through `createMidiLane`**, which exists and is measured
(typical +0.4 ms through the IAC loopback). That closes a real loop: a score
authored in one language, played out of a port, measured by the lane.

### P3 — the demo

`04 score` rebuilt as above. Retire what is there now: its two buttons re-run
work already done at load, so **every assert fires twice** — `16/16` is really
11 checks and 5 duplicates.

### P4 — what it unlocks, and what it does not

`05 vclick` (numbered `28` until 2026-09-07) is now a client of the container
rather than a parallel implementation — P4 is DONE. **Do not assume it collapses into `04`** — vclick's subject is
the tempo integral and seeking into a written score, which is a different claim
from "one container, three languages". Two demos, one substrate.

---

## 4b. P5 — media parts, which are the point rather than an extension

A video or audio snippet IS a quotation:

```jsonc
{ "part": "err-1965-05-12", "at": 0, "in": 3600000, "out": 3720000 }
```

— two minutes starting an hour into a broadcast. This is not a generalisation of
the format, it is the use case the project exists for: the heritage horizon
(ERR, Radio Tallinn 1965) is "slots = a score of spans", and three demos already
do it without a format — `19 flipper` over ERR channels, `22 remixer` playing
1965 clips together, `14 replay` and `15 seek` on video decks.
`timeline/media-master.mjs` already slaves a deck's vector to an
HTMLMediaElement and states the laws: **the master is never nudged**, and
**drift is a `sync()` while a discontinuity is a `seek()`**.

Four things change, and they are the whole of the work.

### 1. A part stops being rows

The container needs a second part KIND:

```jsonc
"parts": {
  "verse":            { "lang": "csound", "rows": [ … ] },
  "err-1965-05-12":   { "lang": "media", "src": "…", "durMs": 7200000,
                        "gopMs": 2000, "codec": "h264" }
}
```

Not pretending a video is a list of notes is §1's rule one level up: normalize
the envelope, never the payload. A `media` part carries what a PLAYER needs to
honour a quotation and nothing that pretends to be an event.

### 2. `in` becomes a request, not a fact

A note starts exactly where it is put. A video seeks to the nearest keyframe —
and with a 2.0 s GOP **only one part per segment is `INDEPENDENT`** (10 of 38
measured), so `in: 3600000` may land at 3599800. That is not an error and must
not be hidden.

**The score records what was ASKED; the player reports what it GOT.** Both
halves already exist: `{degraded, reason}` throughout the library, and the trim
report `quotation()` produces when `in`/`out` are clamped to the deck's range.
A media use needs the same report for keyframe rounding, so a reader can see
that a 2-minute quotation actually began 200 ms early.

### 3. Rate is narrower and repeat is expensive

`rate: 2` over note rows is arithmetic. Over video it is a decoder constraint
plus AV sync, and the honest `caps.rates` for a media part is much shorter than
`[0.25, 0.5, 1, 2, 4]`. `repeat: 3` costs nothing on rows and is three keyframe
seeks on media — and `nested.mjs` already treats a wrap as a re-seek, so the
cost lands on a boundary that is otherwise cheap.

Consequence for the format: nothing. Consequence for the demo: do not put a
looping video beside a looping note part and imply they cost the same.

### 4. Resolution failing is the NORMAL case

**ERR blocks its own segments by PROGRAMME, not by age** — the playlists answer
200 with `access-control-allow-origin: *` while the segments under `/live/hls/`
return 403 with NO ACAO, which reaches a browser as a CORS failure. Swept at 13
points across each 2 h window: `etv` refused its newest ~45 min, `etv2` refused
its OLDEST ~78 min, `etvpluss` served everything. It moves with the schedule.

So a use can resolve to a part that exists and refuses, and that is ordinary.
`loadScore`'s report already carries which refs resolved and which marks moved;
a media score needs a third answer — **resolved, and will not serve** — because
"missing" and "present but refused" are different facts about an archive and
collapsing them is the error this project has already made once, with iOS and
WebTransport.

### Done when

A document holds a Csound part and a media part; a use of the media part reports
the keyframe rounding it actually got; and a refused segment is reported as
refused rather than as absent.

## 5. Traps

- **Do not normalize payloads.** §1. The first pull will be toward a `note`
  field that all three can fill. Three lies in one field.
- **Do not expand repeats in the stored document.** The moment `uses` is
  flattened, the format has lost the only thing it has over a MIDI file, and
  `03`'s lesson — that a loop drawn as one span is a loop nobody can see —
  applies to the text as much as to the picture.
- **`?? 0` when reading a compiled row.** Found three times this session on
  values that were objects or arrays. Any `p50`/`dur`/`beat` read off a compiler
  result must assert its shape, not fall back to zero.
- **A tolerant assert hides a missing subject.** `03` was not looping for its
  whole life behind `wraps > 0 || !reached`. Assert the MECHANISM — "this use
  carries repeat 3 and fired three times" — not "something happened eventually".
- **Csound statements that carry no row** (`f`, `a`, `v`, `r`, `{`, `}`) are
  warnings in the compiler today, not silent drops. Keep that: a score that
  leans on them compiles to something quietly shorter than it reads, and the
  document must carry the warnings so the demo can show them.
- **Beats are not milliseconds and the bug is silent.** Getting the tempo
  integral wrong lands every note slightly off and only an accelerando shows it.
  This project shipped a wrong one for months and its own test agreed with it,
  because the test recomputed the same formula. Check against the reference
  implementation: `timeline/lab/csound-oracle.mjs`.

---

## 6. Definition of done

1. One document plays a Csound part and a MIDI part on one transport.
2. `03`'s arrangement is expressible in it, and its loop is **one entry with a
   count** — verified by the demo lighting the same line three times.
3. Canonical JSON round-trips byte-identically; the JSONL view round-trips back
   to it; both asserted.
4. Every assert fires once. Per-demo counts diffed against the last known total.
