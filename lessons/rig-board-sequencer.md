# Rig lessons: the board's sequencer

<a id="header"></a>

## `sequencer.mjs` header

Built 2026-10-15, `plans/plan-pi-sequencer.md` steps 1 to 5 with clock stage 1 only: the Pi's own clock, notes only, no MIDI clock, start or stop to the Circuit (stage 3, the Pi as master, is refused until the owner decides it). Owner's words: *"start pi seq -> circuit drums work. i will listen in circuit itself, postpone fasttrack"*.

- Every step's time is `epoch + bars * barMs + step * stepMs`, computed, never added up. A tempo change moves the epoch to the next bar line. MEASURED on a fake clock firing each timer 0 to 3 ms late: 1000 bars, every kick within 1e-6 ms of its computed time and none sent more than 3 ms after it. Sabotaged to the classic `next = now + stepMs`: 3 asserts red, 3953 kicks instead of 4000, the last 23.6 s off.
- A note off follows each note on at half a step, so the gate's held set and `midiPanic` stay true.
- A pattern or tempo change while running lands on the next bar.
- A step more than half a step late is skipped and counted, never sent late.
- Stop sends every pending note off and then CC 123 on channel 10 (`B9 7B 00`), both allowed by the gate.
- Status carries the timer's lateness (`late: { n, p50, p99, max }`, the last 512 steps).

<a id="service"></a>

## `createSequencerService`

The verbs are `seq.pattern`, `seq.start`, `seq.stop`, `seq.status`, each answered `seq.state`. Notes leave by a link in the board's OWN bay, `pi-1:sequencer:midi-out -> pi-1:circuit:midi-in { drummap circuit }`, made against the board's announced graph, so the port's consent (`never: ['sysex']`), its channel set and its drum map all apply before a byte is written. The delivery is the Circuit input's `handle({ type: 'midi.send', bytes })`, the same gate `/away/` uses (`inputs.mjs` `midiVerdict`), never an `aconnect` (a subscription into the Circuit blocks the raw write, and an ALSA subscription cannot filter). With the Circuit unplugged the graph has no `pi-1:circuit:midi-in` and Start is refused naming the port.

🔴 `sent` is a wire ENVELOPE field (`wire.mjs` `ENVELOPE`), and `format()` throws on a payload field of that name, so the first build's `seq.state` never left the board: the fake board logged *"wire: "sent" is an envelope field"* and the page's ask timed out while the sequencer ran. The link count is `linked`. `sequencer-test.mjs` now passes every answer through `format()`; putting `sent` back takes that assert red.

<a id="board"></a>

## in `board.mjs`

One service per board, built from `graphOf(graphFacts)` lazily on the first `seq.start`. It keeps running when every tab is closed; only `seq.stop` (or the service stopping, which calls it before the inputs' own panic) stops it. While it runs the screen is its own: `panel.steps` is drawn from the board's step, and a page's `screen.steps` is ignored (answered `ok: false` when asked). The screen's two letter names and look ride in on `seq.pattern`'s `screen` field.

MEASURED 2026-10-15 on the Pi (`raspberrypi`, node 24.21, board service up with jackd on the Fast Track Pro, no audio engine running), the same core in a separate node process emitting into nothing, 120 bpm, 45 s, 360 steps: timer late p50 0.67 ms, p90 1.09, p99 1.22, worst 1.31, none skipped. With two child processes spawned per step (what `panel.steps` costs in `i2ctransfer`): p50 0.78, p99 1.24, worst 1.39. Not measured: the same inside the board process with SuperCollider rendering, and the USB write and the Circuit's own trigger time (plan step 7).

<a id="test"></a>

## `sequencer-test.mjs`

38 asserts: the pattern format, the clock on a fake clock with seeded 0 to 3 ms jitter, changes on the bar line, a 400 ms stall skipping rather than sending late, and the verbs into a fake Circuit through the board's own bay (step 1 of eight rows writes exactly `99 3C 64`, `99 3E 64`, `99 40 64`, `99 41 64`; the four GM extras are dropped by the map; half a step later four `89 xx 00`; Stop writes `B9 7B 00`; nothing is SysEx, a program change or a drum patch CC).
