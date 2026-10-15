# plan-pi-sequencer: a sequencer, sampler and drum synths on the Pi, first driving the Circuit's drums

Status (2026-10-15): open. Plan only. Nothing in `demo/`, `rig/` or `workers/` was changed, nothing was pushed to the Pi, sent to the Circuit, built, deployed or committed.

> Asked 2026-10-15, verbatim in `BACKLOG.md` under `## Open`: *"plan how to
> buuild pi sequencer + sampler + drumsunths. firsdt use case. sequencer driving
> circuit drums. where the note mapping is kept, should sequences go for general
> midi and we have translators to specific drum hw in between?"*
>
> Every claim carries one label, the set `plans/plan-drums-tiny-screen.md` uses:
>
> - **MEASURED**: measured by this repository on the named machine, with the file
>   or date that records it. **Nothing in this document was measured today**; every
>   MEASURED line quotes an earlier measurement.
> - **DOCUMENTED**: Novation's own documents as this repository has already
>   transcribed them (`plans/plan-circuit-model12.md`, which quotes the Circuit
>   User Guide v1.6, the v1.8 addendum and the Programmer's Reference). Not
>   re-read from the PDFs today.
> - **READ**: a file in this repository, with its line, read 2026-10-15.
> - **INFERRED**: reasoning, arithmetic or general knowledge, checked by nobody.
>   Arithmetic says `(arithmetic)`.
>
> It stands on, and does not repeat: `plans/plan-drums-tiny-screen.md` (the keys
> and the OLED; its rung 4 is what this plan builds), `plans/plan-drum-twin.md`
> (the pattern as a spec on the wire, the clock offset, the 21.33 ms block),
> `plans/plan-sampler-pi-pico.md` (`pi-1:sampler`), `plans/plan-patchbay.md`
> (shape against accepts, where a transform runs, clock as its own medium),
> `plans/plan-circuit-model12.md` (§3.1 channels, §3.2 drum notes, §3.4 drum CC,
> §3.9 clock), `plans/plan-pi-oled.md` (steps 5 and 6, the panel in the graph and
> `bay.event` on the board), `research/pi-drum-machines-2026-09-21.md`,
> `research/measured-devices-2026-09-20.md`.

---

## 0. Verdict

1. **The first use case is buildable with no change to the Circuit's consent.**
   The Circuit's four drums are ONE MIDI track on channel 10, notes **60, 62, 64,
   65** (DOCUMENTED, Drum Notes Table; 60, 62 and 64 also MEASURED off its own
   pads on 2026-09-20, 65 never measured). The board's gate already lets note on
   and note off through on channel 10 (READ, `rig/board/inputs.mjs:92` to `:131`,
   and `HANDOFF.md` commit `907b3bf`). So a sequencer in the board's own process
   that writes notes through the SAME gate, by calling the Circuit input's
   `handle({ type: 'midi.send' })` in process, needs no new permission.
2. **The clock, in three stages.** First the Pi runs its own clock and sends only
   notes (no MIDI clock, no start, no stop, no gate change). Second, the Pi
   FOLLOWS the Circuit's clock, which it already transmits unattended at about 122
   bpm (MEASURED, 48.75 `0xF8` a second, 2026-09-20): reading is free and the
   Circuit keeps its tempo knob. Third, and only on the owner's word, the Pi is the
   MASTER, which needs `clock` added to what the Circuit consents to and a gate
   change. Section 2.
3. **The mapping, decided: General MIDI on the wire, voice names in the file,
   each device's map published on its own `midi-in` port, and the translation a
   named transform on the link, `drummap`.** That is option (a) for where the
   translation runs and option (b) for where the map is kept; option (c), raw
   device notes in the pattern, is refused, and the repository already contains
   the collision that proves it: the Circuit's drum 3 is note 64, which in General
   MIDI is a low conga, and `demo/drums/voices.mjs:8` already plays a conga on 64.
   Section 3.
4. **The Pi's drum synths and the sampler fit the same design without a second
   mapping.** Both are General MIDI natively, so their links carry no `drummap`.
   One sequencer row is one GM note; a link per target fans it out; a row a
   target lacks is dropped on that link, warned when the link is made, and drawn
   hollow on the OLED. Choke and the velocity curve belong to the INSTRUMENT
   (the voices, the sampler kit), accent and mute to the PATTERN. Section 4.
5. **Eight steps, each testable with no Circuit first** (`demo/fake-board.mjs`
   already stands in a Circuit MIDI port that records every byte written, READ
   `demo/fake-board.mjs:98` to `:108`). The first two touch only `bay.mjs`, the
   routing core and a new pure map file. Section 5.

---

## 1. The first use case, end to end

### 1.1 What the Circuit expects

| fact | value | label | source |
| --- | --- | --- | --- |
| drum channel | **10**, all four drums as ONE track | DOCUMENTED | `plan-circuit-model12.md` §3.1, User Guide and 1.8 addendum: *"Drum 1/2/3/4 is a single MIDI track"* |
| drum channel settable | 1 to 15 on firmware 1.8; 16 is reserved for the session | DOCUMENTED | §1.2, the 1.8 addendum, verbatim |
| drum 1 | note **60** | DOCUMENTED and MEASURED | Drum Notes Table; pads read 60 on channel 10, `research/measured-devices-2026-09-20.md:174` |
| drum 2 | note **62** | DOCUMENTED and MEASURED | as above |
| drum 3 | note **64** | DOCUMENTED and MEASURED | as above |
| drum 4 | note **65** | DOCUMENTED only | the pad was not hit in the 2026-09-20 capture (`measured-devices` lists 60, 62, 64) |
| the gaps | +2, +2, **+1** | DOCUMENTED | §3.2: *"Anybody writing 60, 62, 64, 66 from the pattern gets three drums and a silent fourth"* |
| pad velocity sent | **96, fixed** | MEASURED | `measured-devices-2026-09-20.md:174` |
| velocity received on drums | **unknown** | none | nothing in the repo measures it; section 6 |
| what sound sits in each slot | **per session** | DOCUMENTED that it is per session | drum patch select is CC 8, 18, 44, 50 on channel 10 (§3.4), and the board's gate REFUSES it (READ, `rig/board/test.mjs:620`, *"drum patch select, CC 8 on channel 10, is refused"*) |
| notes played into the Circuit by `/away/` | drum 1 (ch 10 note 60) and drum 2 (ch 10 note 62) through the board | MEASURED working | `HANDOFF.md`, commit `907b3bf` |

🔴 **The last two rows decide the shape of the map.** A Circuit "drum 1" is a
SLOT, not a kick. Which sound is in it is whatever the loaded session says, the
page cannot change it (the gate refuses the drum patch CC, on purpose), and a
factory session's choice of sounds per slot is not recorded anywhere in this
repository. So the Circuit's map names its targets as `drum 1` to `drum 4`, and
the default pairing below is a guess the owner confirms by ear (section 5, step
3):

| GM voice | GM note | Circuit slot | Circuit note | label |
| --- | --- | --- | --- | --- |
| kick | 36 | drum 1 | 60 | INFERRED pairing |
| snare | 38 | drum 2 | 62 | INFERRED pairing |
| closed hat | 42 | drum 3 | 64 | INFERRED pairing |
| open hat | 46 | drum 4 | 65 | INFERRED pairing |

### 1.2 The path a note takes

READ, all on the board today:

1. The Circuit is its own USB MIDI device, **not** behind the Fast Track Pro
   (`HANDOFF.md:443`: *"I put a wrong premise into an agent brief (the Circuit's
   MIDI through the FastTrack). The agent checked the repo and refused it: its
   MIDI is its own USB card"*). ALSA calls it `Circuit`, `/proc/asound/Circuit` is
   `card7` (MEASURED, `HANDOFF.md:1497` to `:1499`). The Fast Track Pro carries
   only the Circuit's SOUND back, its left output on input 1
   (`HANDOFF.md:1500`), which the board takes as `circuit:capture_1` on JACK
   (`graph-registry.mjs` `inputJack`).
2. The board writes raw MIDI to `/dev/snd/midiC<n>D0`, opened
   `O_WRONLY | O_NONBLOCK`, the card resolved by name on every open
   (`inputs.mjs:438` to `:453`).
3. 🔴 **An ALSA sequencer subscription into the Circuit and this raw write
   cannot coexist.** MEASURED on the Pi 2026-10-03: while any subscription into
   the Circuit exists, opening the raw device for write blocks (now EBUSY in 0 ms,
   `BACKLOG.md:1443` onward). And `aconnect` cannot carry a transform at all:
   `alsa.mjs:158` refuses any `carry` subset with *"an ALSA subscription cannot
   filter"*. **So a sequencer link into the Circuit is never an `aconnect`.** It
   is a node call inside the board process, through the gate, with the
   transforms run in node.
4. The gate, `midiVerdict(bytes, [1, 2, 10])` (`inputs.mjs:92`): note on and off
   on the configured channels pass; a one byte message (clock, start, stop) is
   refused at `inputs.mjs:114` (*"three bytes, a channel voice message"*). Notes on
   channel 10 need nothing new.

### 1.3 Latency, and why the sequencer goes on the Pi

| path | number | label |
| --- | --- | --- |
| key press on `/away/` to the Circuit's note coming back to the page | **78 to 99 ms, median about 93** | MEASURED 2026-09-30, `HANDOFF.md` "The latency" |
| relay, board to browser frame gaps | p90 29.5, p99 43.5, worst **83.6 ms** | MEASURED 2026-09-16 (`plan-drum-twin.md` §3.1) |
| relay round trip, Mac to Pi | 64 to 69 ms | MEASURED 2026-09-14 |
| a step at 120 bpm | 125 ms | arithmetic |
| node to `/dev/snd/midiC7D0` to the Circuit, USB full speed | about 1 ms of USB framing per write | INFERRED (USB full speed schedules in 1 ms frames; never measured on this desk) |
| the same note over DIN (Fast Track Pro MIDI out to the Circuit's TRS in) | 0.96 ms per 3 byte message, so four drums on one step smear over **3.8 ms** | arithmetic, 30 bits at 31,250 baud |
| node `setTimeout` jitter on the Pi under audio load | **unknown** | to measure, step 7 |
| the Circuit's own trigger to sound | **unknown** | to measure, step 7 |

The relay's worst gap is two thirds of a step. A step per message from a tab
flams at random, which `plan-drum-twin.md` §3.1 already refused. **On the Pi the
network leaves the timing path entirely**: what is left is a node timer, one USB
frame and the Circuit itself, all of them a constant offset plus a jitter that
step 7 measures. USB beats DIN for this (one frame for a whole step against 3.8
ms of serial smear), so the Circuit's own USB port stays the path.

⚠️ **The raw MIDI port has no timestamps.** Unlike scsynth (timetagged bundles,
`scollide.mjs` `place()`), a byte written to `/dev/snd/midiC7D0` leaves when it is
written. So the board's sequencer schedules with look-ahead for the Pi's own
drums (timetags) and FIRES on time for the Circuit (a timer aimed at the step).
A busy-wait for the last millisecond is refused: it burns a core on a board that
also renders audio. If step 7 measures the timer as too loose, the next answer is
a tiny C writer fed timestamps (the board already compiles `rig/route-core/`
and Plaits on itself), not a spin.

### 1.4 What has to exist on the board

| thing | file | status |
| --- | --- | --- |
| the pattern format, pure, shared by the page and the board | `demo/shell/pattern.mjs` (new) | not built |
| the sequencer engine: pattern, tempo, steps, mutes, look-ahead, note offs, a bar boundary for changes | `rig/board/sequencer.mjs` (new; tiny-screen's rung 4 named it `steps.mjs`, one file either way) | not built |
| its clock: `performance.now()` on the Pi, step times computed from a bar origin, never accumulated | inside `sequencer.mjs` | not built |
| storage: patterns as JSON on the SD card, written atomically (write then rename) | `/opt/positron-board/state/patterns/<name>.json` | not built. INFERRED that it survives `push.sh`, which untars over `/opt/positron-board` without deleting (READ `rig/board/push.sh:40` to `:44`) |
| a light link router between the board's own nodes | `rig/board/board.mjs` holding a `createBay()` of its own `boardGraph`, delivering `midi` and `value` events between `pi-1:*` ports | not built; it is `plan-pi-oled.md` step 6 (`bay.event` on the board), still open |
| the ports in `boardGraph` | `demo/shell/graph-registry.mjs` | `pi-1:sequencer`, `pi-1:screen`, `pi-1:keys` are not announced today (READ, `lessons/page-devices.md` via `plan-drums-tiny-screen.md` rung 4) |
| the drum voices loaded at boot with no tab | `rig/board/scollide.mjs` `load()` fed `demo/drums/voices.mjs` text | the compile path exists and runs for `/drums/remote/` when a TAB sends the text (READ `scollide.mjs:155`); loading at boot is new. A static import of `voices.mjs` from a `rig/board` module makes `push.sh` ship it (READ `push.sh:43`) |

The ports, as `boardGraph` would announce them (`<medium>-<dir>` names,
`graphProblem` enforces it, READ `graph-registry.mjs:271`):

```
pi-1:sequencer           kind engine, catalogue name 'sequencer' (demo/shell/nodes.mjs:350)
  midi-out               emits ['note'], no `shape.channels` (see 3.5)
  value-in               shape { of: 'pattern' } and the keys' { of: 'key' }
  value-out              { of: 'steps' }, what the screen and a mirroring tab draw
  clock-in               stage 2: follows a clock (the Circuit's)
  clock-out              stage 3 only, on the owner's word
pi-1:keys      value-out (exists only on pages today)
pi-1:screen    value-in  (exists only on pages today)
pi-1:circuit   midi-in   gains `drums: { name: 'circuit', channel: 10, map, labels }` (section 3)
pi-1:drums     midi-in   gains `drums: { name: 'gm', ... }`, its notes now delivered by the board's router
pi-1:sampler   midi-in   gains a drum kit set, GM keyed (section 4)
```

The links of the first use case, as the bay's text form prints them:

```
pi-1:keys:value-out      -> pi-1:sequencer:value-in
pi-1:sequencer:value-out -> pi-1:screen:value-in
pi-1:sequencer:midi-out  -> pi-1:circuit:midi-in   { drummap circuit }
```

and, the same pattern on the Pi's own drums at once:

```
pi-1:sequencer:midi-out  -> pi-1:drums:midi-in
pi-1:drums:audio-out     -> pi-1:ftpro:audio-in     (a JACK link, jackRows)
```

### 1.5 What the page, the Pi's screen and the keys do

- **The keys and the screen** are tiny-screen's rungs 1 and 3, moved into the
  board: `^ v` move the cursor, `#` writes, `*` plays, `*` held with `^ v` picks
  the row (READ, `plan-drums-tiny-screen.md` §4). A key goes to the sequencer in
  the same process; with no tab open the Pi is a drum machine on its own, which is
  the test for rung 4.
- **The screen's status line** gains one word for the target: `CIR`, `PI`, or
  `CIR+PI`. A row the current targets cannot play is drawn with the muted style
  rung 3 already defines (flattened 2 px bars), so `CP LT HT CB` read as present
  in the pattern and silent on the Circuit. Changes `demo/shell/steps-oled.mjs`
  and `rig/board/panel.mjs` `steps()` (READ `panel.mjs:135`).
- **The page** (`/devices/drums/`, https://positron.studio/devices/drums/)
  becomes the mirror and second editor: `pi-1:sequencer:value-out ->
  web:sequencer:value-in` to draw, `web:sequencer:value-out ->
  pi-1:sequencer:value-in` to edit, both light links over the relay. The bay
  picture at its foot draws the `drummap circuit` link with MIDI's dashed texture
  (READ, commit `e1e292e5`), and `See details` lists the map row by row. A visit
  still opens nothing; the board is reached on the first press.

---

## 2. The clock: who clocks whom

| | Pi free, notes only | Pi follows the Circuit | Pi is the master |
| --- | --- | --- | --- |
| what crosses the wire to the Circuit | notes on ch 10 | notes on ch 10 | notes, `F8` 24 a beat, `FA` `FC` `FB` |
| gate change | **none** | **none** (reading) | **yes**: a one byte realtime class from the board's own sequencer only, never from a page |
| consent change on `pi-1:circuit:midi-in` | none | none | `clock` added, which `plan-patchbay.md` §6 lists as **not** accepted (*"it is already the master and sends its own"*) |
| the Circuit's own sequencer | runs on its own clock if somebody presses its Play; the two drift | locked to the Pi's drums, the Circuit conducts | locked, the Pi conducts |
| who has the tempo knob | the Pi (menu, tiny-screen rung 5) | **the Circuit** | the Pi; the Circuit's knob is disabled while it follows (DOCUMENTED §3.9) |
| hazards | none new | the board must hold the Circuit's MIDI input open, today only under a lease and polled every 20 ms (READ `inputs.mjs:525` to `:560`) | `FA` starts the Circuit's OWN session pattern, so its drums play twice; *"If an external clock is removed... Circuit will stop playing"* (DOCUMENTED §3.9); with Clock Tx ON a following Circuit re-transmits *"whatever the source"*, one link away from a loop |
| measured facts it stands on | none needed | the Circuit sends `F8` unattended at about 122 bpm, 48.75 a second (MEASURED 2026-09-20). Whether it sends `FA` and `FC` on its Play button is DOCUMENTED as supported and never measured | Clock Rx is ON at the factory (DOCUMENTED); this unit's setting is unknown |

**Recommendation, with reasons.**

1. **Stage 1, free running.** It needs nothing the Circuit has not already
   consented to, so the first use case is built and graded without a single
   decision about the instrument. Two crystals drift by tens of parts per
   million, about **6 ms in two minutes at 50 ppm** (arithmetic), which only
   matters if the Circuit's own sequencer plays at the same time, and its
   internal tempo is integers only anyway (DOCUMENTED, 40 to 240).
2. **Stage 2, follow the Circuit.** It is the instrument with a tempo knob in
   the owner's hands, it already transmits a clock whether anybody asked
   (MEASURED), and following is a READ: nothing new reaches the Circuit. The cost
   is on the Pi: the input held open while the sequencer follows, and a tempo
   estimate. Polling every 20 ms puts 20 ms of uncertainty on each `F8`'s arrival
   (READ, `BACK_POLL_MS = 20`); averaged over 24 ticks that is a usable tempo
   (INFERRED), and the PHASE comes from `FA` if the Circuit sends one, which is
   the first thing to measure. The parser already skips realtime bytes for the
   macro knobs (READ `midi-back.mjs` `createMidiParser`), so counting them is a
   small addition beside it. `bay.mjs` already has `clock` as a medium
   (`MEDIA`, READ `bay.mjs:18`), so the link is `pi-1:circuit:clock-out ->
   pi-1:sequencer:clock-in`, its own medium, never riding the MIDI link, as
   `plan-patchbay.md` §3.4 requires.
3. **Stage 3, the Pi as master, only when asked.** It is the larger commitment
   `plan-circuit-model12.md` §3.5 warned about (*"the only way to change a
   Circuit's tempo remotely is to become its clock master"*), it changes a consent
   the repository wrote down, and it can start the Circuit's own pattern. The
   owner decides it, in words, before any code.

---

## 3. The mapping question, decided

### 3.1 What the repository does today

- READ `demo/drums/voices.mjs:6` to `:9`: *"General MIDI's drum notes, which is
  what the sequencer sends and what each wire into a voice lets through"*,
  `NOTE = { kick: 36, snare: 38, hhc: 42, hho: 46, clap: 39, tomlo: 45, tomhi:
  50, cowbell: 56, ... congalo: 64, congahi: 63 ... }`.
- READ `demo/drums/drum-machine.mjs:375`: the browser sequencer sends
  `{ cls: 'note', ch: 10, d1: v.note, d2: 100 }`, General MIDI on channel 10 at
  a fixed velocity of 100.
- READ `drum-machine.mjs:290`: each voice hears its own note through a link
  carrying `{ op: 'range', lo: v.note, hi: v.note }`.
- READ: the pattern itself is grid rows in voice order (`grid.pattern()`), so a
  row IS a voice, and the note is attached when the step is sent.

So the browser already stores voices and speaks General MIDI. The question is
only what happens at a device that does not.

### 3.2 The three options

| | (a) GM in the pattern, a `drummap` transform per target on the link | (b) voice ids in the pattern, each device publishes its map on its `midi-in` | (c) the target's raw notes in the pattern |
| --- | --- | --- | --- |
| one pattern on the Circuit AND the Pi's drums | yes, one link each | yes | **no**: Circuit 64 is GM low conga, and `voices.mjs` plays a conga on 64 |
| where the device's knowledge lives | on every link that reaches it, unless the link names it | **once, on the device's port** | inside every pattern written for it |
| what the patchbay picture shows | the translation, on the link | nothing, unless the link also says so | nothing to show, and nothing to explain why the Pi plays congas |
| the bay's existing precedent | transforms are MIDI ops on a link (`bay.mjs:145`) | `patch`: the link names it, the PORT lists what may be named, the bay checks at link time (`bay.mjs:263`, `patchFor` at `:545`) | none |
| a voice the device lacks | the transform drops it | the port's map lacks it | the pattern cannot even express it |
| a second Circuit, or the drums moved to channel 9 on firmware 1.8 | edit every link, or one map if links name it | **edit one map** | rewrite every pattern |
| text form round trip | yes | yes, if the link names the map | yes |
| runs where | `bay.apply` in a tab, `route-core` on the board and in C | the destination's runtime, invisibly | nowhere |

### 3.3 The decision: (b)'s storage, (a)'s translation

1. **The file keeps voice names** (`kick`, `snare`, `hhc`). Readable, diffable,
   and what the screen labels (`BD SD OH CH`) are made from. A name not in
   `NOTE` is refused when a pattern is loaded.
2. **The wire carries General MIDI, channel 10**, exactly as the browser does
   today, so every GM thing (the browser drums, the Pi drums, the sampler kit, any
   GM module plugged in later) needs no translation at all.
3. **Each device that is not GM declares its own map once**, in
   `demo/shell/drum-maps.mjs` (new, pure, import free so `push.sh` ships it and
   `graph-registry.mjs` can be handed it the way it is handed `patches`, READ
   `graph-registry.mjs:105`). `boardGraph` puts it on that device's `midi-in` as
   `drums`.
4. **The translation is a transform on the link, `{ op: 'drummap', name:
   'circuit' }`**, resolved against the destination port's `drums` when the link
   is made, exactly as `patch` is resolved against `patches`. The bay stores the
   resolved table on the link so `apply()` stays pure (it never sees a port), and
   the text form prints only the name, `{ drummap circuit }`.
5. **A link with no `drummap` into a port whose map is not GM is still allowed,
   with a warning**: `Circuit takes its own drum notes (60, 62, 64, 65); this
   link sends General MIDI, so a kick (36) will not sound. Add { op: 'drummap',
   name: 'circuit' }.` The warning is the bay's existing `warn` channel
   (`bay.mjs` `warns.push`), so a person sees it where they see every other one.

Why not (b) alone, translated silently by the destination: the picture would
show a plain wire into the Circuit while the notes changed underneath it, which
is the failure the concepts skill names (*"EVERYTHING A PAGE SHOWS ARRIVES ON A
LINK"*), and `plan-patchbay.md` §3.3 puts a translation "as near the source as
possible", with only consent fixed at the destination. Why not (a) with a table
typed on each link: the Circuit's `60, 62, 64, 65` would live in every patch,
and the one +1 gap is exactly the kind of number that gets typed as 66.

### 3.4 The map, concretely

```js
// demo/shell/drum-maps.mjs (new). Keys are GM notes, values the device's own.
export const DRUM_MAPS = {
  gm:      { label: 'General MIDI', channel: 10, map: null },          // identity
  circuit: {
    label: 'Circuit drums', channel: 10,                               // DOCUMENTED, settable 1..15 on fw 1.8
    map:    { 36: 60, 38: 62, 42: 64, 46: 65 },                        // notes DOCUMENTED; pairing INFERRED
    labels: { 60: 'drum 1', 62: 'drum 2', 64: 'drum 3', 65: 'drum 4' },
  },
};
```

`drummap` runs on note on and note off alike (a release must find the same
note), sets the channel to the map's, and DROPS any note the map lacks. It is one
note to one note, so it stays a transform rather than a node (the concepts
skill: *"a transform maps one note to one"*). In `route-core.mjs` (integers only,
READ its header) the resolved table is 128 entries of a note or `-1`, which the C
port copies line by line. A new vector, `route-vectors/23-drummap.json`, holds
both ends to it, including the note off and a dropped clap.

### 3.5 Two small bay fixes the first link needs

1. **The channel shape compare.** `pi-1:circuit:midi-in` declares `shape: {
   channels: [1, 2, 10] }` (READ `graph-registry.mjs:212`), and `validate`
   compares shape fields by JSON equality (READ `bay.mjs:876` to `:884`), so a
   sequencer declaring `channels: [10]` would be REFUSED for not being `[1, 2,
   10]`. Either the sequencer declares no channels (it gets the map's channel from
   the link), or `channels` is compared as a subset. Recommended: the subset rule,
   in `bay.mjs` with a test, because it is the true meaning (a source on channel
   10 fits a port that plays 1, 2 and 10).
2. **`drummap`'s refusal words** in `SAYS` (`bay.mjs:290`): `does: 'plays General
   MIDI drums on an instrument's own drum notes'`, `part: { name: 'the drum map' }`,
   `ask` naming a real map. `bay-test.mjs` asserts every op has them.

### 3.6 How the picture and the screen show it

- **The bay picture**: the link carries a transform, so the existing view draws
  it as a transformed MIDI link; `See details` prints `drummap circuit` and, from
  the resolved table, `36 kick -> 60 drum 1`, one row per mapped voice, plus
  `dropped: clap, low tom, high tom, cowbell`.
- **The Pi's OLED** (`steps-oled.mjs`): the status line names the target; rows
  the target drops draw muted. On `screen.patch` (the patch view, `bay-oled.mjs`)
  the link is MIDI dashed like any other (READ, commit `e1e292e5`).
- **Link time words**, from the bay's `warn`: `Circuit drums has no clap, low
  tom, high tom or cowbell; those 4 rows will be silent on it.`

---

## 4. The sampler and the drum synths in the same design

### 4.1 The Pi's drum synths, `pi-1:drums`

- They are `demo/drums/voices.mjs`'s SuperCollider programs, compiled on the
  board by `sclang-lite` with no sclang (READ `scollide.mjs:155` to `:181`;
  `plan-drum-twin.md` §6.1). Loaded once at boot from the imported file, not
  sent by a tab. `MAX_DEFS = 16` (READ `scollide.mjs:58`) holds the 8 rows
  `/devices/drums/` plays with room to spare; the 18 voice set (`more: true`)
  does not fit beside anything else and is refused in words.
- Its `midi-in` is GM: the board's router turns a note into an `sc.hit` for the
  voice whose `NOTE` it is, with `at` set to the step's time (timetagged, so
  exact to scsynth's block; one JACK period late at most, 21.33 ms on the dummy
  clock, 10.67 ms at the card's default 512, READ `jacksynth.mjs:139` and
  `inputs.mjs:168`).
- **Choke** is the instrument's: `hhc` (and GM 44, pedal hat, if it is ever
  added) chokes `hho`. Today the browser keeps that pair in `drum-machine.mjs`
  (`opens`, `closes`) and the board already has a `choke` field on `sc.hit`
  that closes every live node of the named program in the same bundle (READ
  `scollide.mjs:259` to `:273`). Move the pair into `voices.mjs` as data
  (`{ key: 'hhc', chokes: ['hho'] }`) so both renderers read one table.
- **Velocity**: `sc.hit` takes no velocity today. The board's `noteOn` already
  scales `amp` by `ampDefault * vel / 127` (READ `scollide.mjs:307`). For hits
  the reference is the browser's fixed 100 (READ `drum-machine.mjs:375`), so
  `amp = ampDefault * vel / 100`, clamped to 1 by the existing `argsFor` clamp:
  every pattern written today sounds exactly as loud as it does now, and an
  accent at 127 is +2.1 dB (arithmetic) until the clamp.

### 4.2 The sampler, `pi-1:sampler`

- It runs today with three melodic sets (piano, Rhodes, FluidR3 piano), picked
  by program change, notes on `node: 'sampler'` (READ `scsampler.mjs:101` to
  `:118`, `board.mjs:598` to `:603`). Each set maps a note to the nearest
  recorded note and repitches (`nearestIn`).
- A **drum kit set** is one more entry: `files` keyed by GM note, rate 1 (no
  repitch), and a `choke` group per file. It is GM keyed by construction, so its
  link needs no `drummap`. Samples come the way `plan-drum-twin.md` §1.3 says
  (decoded PCM, not files) or from R2 as the piano does. One known trap: the
  sampler damps a voice already sounding on the same note (READ
  `scsampler.mjs:180`), which is right for a hat and wrong for a ride; the kit
  set needs a per file `retrigger` flag.

### 4.3 One row, either target

```
row 'kick', level 2 at step 1
  -> sequencer emits { note on, ch 10, 36, vel 127, at }
       -> pi-1:circuit:midi-in   { drummap circuit }   ch 10 note 60 vel 127, fired at `at`
       -> pi-1:drums:midi-in                            sc.hit kick, amp 0.8 * 1.27 clamped, timetag `at`
       -> pi-1:sampler:midi-in                          the kit's file for 36, timetag `at`
```

- **Accent and mute are the pattern's**: a step holds `0`, `1` or `2`
  (tiny-screen rung 3), the pattern carries `vel: [0, 100, 127]`, and a muted
  row sends nothing at all. Neither belongs to an instrument.
- **Choke and the velocity curve are the instrument's.** The Circuit does its
  own (unknown, section 6); the Pi drums and the sampler each read their own
  table.
- **The pattern file**, one shape for the page and the board
  (`demo/shell/pattern.mjs`):

```json
{ "v": 1, "name": "A1", "bpm": 120, "steps": 16, "vel": [0, 100, 127],
  "rows": [ { "voice": "kick",  "steps": "2000100020001000", "mute": false },
            { "voice": "snare", "steps": "0000200000002000", "mute": false },
            { "voice": "hhc",   "steps": "1111111111111111", "mute": false } ] }
```

One character a step, the same density as `screen.steps` today (READ
`plan-drums-tiny-screen.md` rung 3). Unlike `plan-drum-twin.md`'s `pattern.set`
it names voices rather than pack rows, because these voices are code, not
samples; its `version` and `sha` rules carry over unchanged when a kit is sample
based.
- **A note off** follows each note on at half a step, so the gate's held set and
  `midiPanic` (READ `inputs.mjs:634`) stay true, and the stop button sends CC 123
  on channel 10, which the gate already passes.

---

## 5. Build order

Each step names what it touches, how it is graded with no Circuit, and what is
measured. Verifying is per touched file and page, never a whole suite (CLAUDE.md,
*verify economically*). Steps 1, 2 and 4 touch shared files and are one agent's
each, before any page work.

| step | what | files | graded with no Circuit | then with it | measured |
| --- | --- | --- | --- | --- | --- |
| 1 | **`drummap` in the bay and the routing core** | `demo/shell/bay.mjs` (op, `SAYS`, link time resolution, the warning, the channel subset rule), `demo/shell/bay-test.mjs`, `demo/shell/route-core.mjs`, `demo/shell/route-vectors/23-drummap.json`, `rig/route-core/route_core.c`, `lessons/kit-bay.md` | `node demo/shell/bay-test.mjs`, the vectors in JS and C (`rig/route-core/test.sh`); sabotage: map 46 to 66 turns red | not needed | test counts before and after; the sabotage red |
| 2 | **The maps on the ports** | `demo/shell/drum-maps.mjs` (new), `demo/shell/graph-registry.mjs` (`drums` passed in like `patches`), `demo/shell/graph-registry-test.mjs`, `rig/board/board.mjs` (passes it) | `node demo/shell/graph-registry-test.mjs`: `pi-1:circuit:midi-in` carries the Circuit map, `pi-1:drums:midi-in` GM | not needed | assert counts |
| 3 | **The browser proves the map on a stand-in, then on the Circuit** | `demo/devices/drums/index.html`: a `web:sequencer:midi-out -> pi-1:circuit:midi-in { drummap circuit }` link that sends `midi.send` to `studio-1-circuit` as `/away/` does, on play only | `node demo/fake-board.mjs`, the page at `?relay=ws://127.0.0.1:8897&board=1`; `fake-board`'s `written` (READ `fake-board.mjs:400`) shows `99 3C 64`, `99 3E 64`, `99 40 64`, `99 41 64` and nothing for the four GM extras | **the owner's press**: one bar with the Circuit's Record OFF; the owner says which sound each of 60, 62, 64, 65 is in the loaded session, which settles 1.1's pairing and measures note 65 for the first time | bytes per kind on the stand-in; on the Circuit, four slots heard or not. The relay's jitter is audible here and is not a fault: it is the reason for step 5 |
| 4 | **The pattern and the sequencer core, pure** | `demo/shell/pattern.mjs` (new), `rig/board/sequencer.mjs` (new, `createSequencer({ now, setTimer, emit })`), `rig/board/test.mjs` | a fake clock: every note's `at` is exactly `origin + i * stepMs`; a tempo change and a pattern change land on the bar; a muted row emits nothing; offs follow ons; sabotage: accumulate time instead of computing it, and a 1000 bar run drifts red | not needed | test counts; the drift under sabotage |
| 5 | **The board routes its own links, the tab closed** | `rig/board/board.mjs` (a `createBay()` of its own graph; `board.link` / `board.unlink` verbs mirroring `jack.link`; links kept in `/opt/positron-board/state/links.json`), the Circuit delivery through `hwInputs.get('circuit').handle({ type: 'midi.send' })`, the drums delivery as `sc.hit`, voices loaded at boot; `demo/fake-board.mjs` (timestamps on `written`) | fake board, no tab: one `board.link` and a pattern, then the tab closed; the stand-in Circuit receives a bar a bar. The refusals: a link carrying `sysex` into the Circuit, refused at the board's own bay | not yet | interval of each written note against its step, on the Mac in node: p50, p99, worst |
| 6 | **Keys and screen on the board** | `plan-pi-oled.md` steps 5 and 6 (`pi-1:screen`, `pi-1:keys` in `boardGraph`, `bay.event`); tiny-screen rungs 1 and 3 moved into `sequencer.mjs`; `rig/board/panel.mjs`, `demo/shell/steps-oled.mjs` (target word, muted rows); `/devices/drums/` becomes the mirror | the page's simulated screen and keys are the same bytes as the board's (READ `panel-screen.mjs`); `node demo/verify.mjs devices/drums` once, and the assert count read against today's | after `push.sh` (the owner's go), the Pi plays with no tab open | assert count; key to screen time on the Pi (tiny-screen step 0) |
| 7 | **The real desk** | none new; `rig/board/measure.mjs`-style script for the two numbers below | n/a | sequencer to Circuit for one minute, Record OFF | (a) the Pi's timer jitter: the write time of every note against its target, p50, p99, worst, with and without audio running; (b) end to end on ONE clock: the board writes note 60 at `t` and finds the onset in `circuit:capture_1` on the same Pi, so the Circuit's own trigger latency is a number; (c) the Pi drums and the Circuit side by side, and a per target offset set from (b) |
| 8 | **Clock, stage 2, then velocity, choke and the sampler kit** | `inputs.mjs` (count `F8`, catch `FA` and `FC` while following), `sequencer.mjs` (`clock-in`), `voices.mjs` (`chokes`), `scollide.mjs` (`vel` on `sc.hit`), `scsampler.mjs` (a kit set) | a stand-in Circuit that sends `F8` at a chosen tempo with jitter added; the sequencer's tempo estimate within 0.5 bpm in 2 s (a guess, to be set by the test) | the Circuit's tempo knob moves the Pi | estimate error and settle time; whether the Circuit sends `FA` and `FC` at all |

Stage 3 (the Pi as master) is not in the table on purpose. It is a decision
first.

---

## 6. What is uncertain, and what settles it

1. **Which sound is in each Circuit drum slot** in the session that is loaded.
   Per session by design, not selectable from here (the gate refuses CC 8, 18,
   44, 50). Settled by ear in step 3, once per session the owner uses; the map's
   pairing is a default, not a fact.
2. **Note 65 has never been measured.** Step 3.
3. **Whether the Circuit's drums respond to incoming velocity.** Its pads send a
   fixed 96 (MEASURED); firmware 1.8 added per note velocity for the synths
   (DOCUMENTED, `plan-circuit-model12.md` §1.2) and nothing says what drums do
   with a received one. Step 3: one bar at 40 and one at 127, by ear or on
   `circuit:capture_1`.
4. **The firmware on this unit**, which decides whether the drum channel can
   move and whether Clock Rx and Tx are separate switches (`plan-circuit-model12.md`
   §1.1, §3.9). The Device Inquiry the gate already allows answers it with no
   menu (READ `inputs.mjs:38`).
5. **The Clock Rx and Tx settings on this unit.** Factory is both ON
   (DOCUMENTED). Matters only from stage 2.
6. **Whether the Circuit sends `FA` and `FC` on its own Play.** DOCUMENTED as
   supported, never measured. Decides how stage 2 finds the bar.
7. **Node timer jitter on the Pi under audio load, the USB write, and the
   Circuit's own trigger time.** All unmeasured. Step 7 measures them on one
   clock, the Pi's.
8. **Whether anything audible is plugged into the Fast Track Pro's outputs**
   (`plan-drums-tiny-screen.md` §5 item 6), which the Pi's own drums need to be
   heard in the room rather than only over the relay.
9. **Whether jackd on the board runs on the card or the dummy clock today.** The
   board env recorded in `HANDOFF.md:1488` names no `jackd` input; the period
   decides the Pi drums' lattice (21.33 ms or 10.67 ms).
10. **Whether `/opt/positron-board/state/` survives a reflash or `setup.sh`.**
    INFERRED for `push.sh`; nothing read says for `setup.sh`.

### 6.1 The Circuit's safety rules that apply

From CLAUDE.md, `positron-hardware` and the board's own tests:

- **SysEx never.** The sequencer emits `note` only (and `clock` from stage 2's
  READ side, never written). `pi-1:circuit:midi-in` says `never: ['sysex']`
  (READ `graph-registry.mjs:212`) and the bay refuses at link time; the board's
  gate is the second lock and allows only the two SysEx READS (READ
  `inputs.mjs:88` to `:90`). Nothing in this plan writes a patch, a session or a
  pack, and none of `Send to Circuit`, the Factory Pack or a `Replace Patch`
  appears anywhere in it.
- **Consent is a port field, not a habit.** The first use case adds nothing to
  `accepts`. Stage 3 would add `clock`, and that is the owner's decision in
  writing, not this plan's.
- **No program change, no drum patch CC.** The sequencer sends neither, and the
  gate refuses the drum patch CC on channel 10 already (READ `test.mjs:620`).
- **Notes can be recorded into the Circuit's pattern if its Record is armed.**
  INFERRED from *"external MIDI controller recording"* in firmware 1.2
  (DOCUMENTED, `plan-circuit-model12.md` §1.2). That lands in RAM; only Save
  writes flash, and Save ships disabled (DOCUMENTED, `positron-hardware`). So the
  rule for every step that reaches the real Circuit: **Record off, and a press on
  the real Circuit is the owner's**, the same precedent as `/away/`'s program
  change, which was built and left for the owner to press.
- **Stop means silence.** Stop sends the pending note offs and CC 123 on channel
  10, both allowed by the gate; the board's `midiPanic` releases anything left on
  shutdown (READ `inputs.mjs:634`, `:777`).
- **The relay is tokenless.** Anyone in `studio-1` can send `pattern.set` or a
  `board.link`, as anyone can send `midi.send` to `/away/`'s room today. The
  blast radius is notes on channel 10 of one instrument, no larger than what is
  open now (`plan-drum-twin.md` §6.1 makes the same argument for SynthDefs).

---

## Sources

READ, 2026-10-15: `demo/drums/voices.mjs`, `demo/drums/drum-machine.mjs`,
`demo/devices/drums/index.html`, `demo/shell/bay.mjs`,
`demo/shell/graph-registry.mjs`, `demo/shell/route-core.mjs`,
`demo/shell/nodes.mjs`, `demo/shell/board-collide.mjs`, `demo/fake-board.mjs`,
`rig/board/board.mjs`, `rig/board/inputs.mjs`, `rig/board/midi-back.mjs`,
`rig/board/alsa.mjs`, `rig/board/scollide.mjs`, `rig/board/scsampler.mjs`,
`rig/board/panel.mjs`, `rig/board/jacksynth.mjs`, `rig/board/push.sh`,
`rig/board/test.mjs`, `HANDOFF.md`, `BACKLOG.md`, and the plans and research
named at the top.

DOCUMENTED, through `plans/plan-circuit-model12.md` and
`plans/plan-circuit-editor.md`: Circuit User Guide v1.6, the v1.8 addendum,
the Circuit Programmer's Reference (Drum Notes Table, Drum Control table,
Settings View, clock paragraphs).
