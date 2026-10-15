# Rig lessons: the Circuit's drums into the board's drums

<a id="header"></a>

## `circuit-drums.mjs` header

Built 2026-10-15 on *"can we do circuit drums -> pi drums (synth?)? i need to listen via relay atm (can not get ftpro cabling right atm)"*, then *"queue. can we see also circuit output on pi screen?"*, and a live grid on the Pi's screen accepted. No Fast Track Pro on the path: the sound is the board's SuperCollider drums (`pi-1:drums`, the same four voices as /drums/remote/) heard in a tab over the relay.

- The link is `pi-1:circuit:midi-out -> pi-1:drums:midi-in { drummap circuit }`, made in the board's own bay against its announced graph. The drummap is the Circuit's own map read backwards (`readBack` in drum-maps.mjs, `lessons/kit-drum-maps.md#read-back`), so 60 62 64 65 on channel 10 arrive as GM 36 38 42 46 and nothing on channels 1 and 2 (the synths) ever reaches the drums.
- The Circuit is only READ. The service has no write path at all; it reads through the Circuit input's `tap` (inputs.mjs), the one open of the input it shares with the macro knobs and the patch dumps. The test asserts nothing is written.
- A hit is the board's own `collide.core().hit` with no `at`, so it plays at once; the closed hat chokes the open hat when both are loaded, as on /drums/remote/. With no engine running a hit is refused and counted with its reason (`the drums are not running on the Pi`); a page starts the engine and loads the voices (Listen on /devices/circuit/).
- Note offs are counted and ignored: the voices free themselves.
- The link is the board's state: closing the tab leaves it held; a board restart drops it.

<a id="grid"></a>

## `createClockGrid`

16 steps of 6 ticks (24 a beat). Entering a step clears that column and then lights what was waiting for it, so each square holds the last bar's hit there and is overwritten as the step comes round. A hit in the second half of a step (tick 3 to 5 of 6) waits for the next step: a pad hit a little early lands on the beat it was meant for, and the Circuit's own sequencer sends its note on the tick, so it lands where it is.

Bars: Start (`FA`) clears the grid and puts step 0 on the first tick after it (the MIDI convention), Stop (`FC`) holds the frame where it is while the clock keeps ticking (the Circuit sends `F8` unattended, MEASURED 2026-09-20 at 122 bpm), Continue (`FB`) moves on. Whether this Circuit sends `FA` and `FC` on its Play button is still NOT MEASURED (`plans/plan-pi-sequencer.md` §2); the status says which happened in `clock.aligned` (`start`, `first hit`, or null). Without a Start the first hit after the link is step 0, so the grid may sit at a rotation against the Circuit's own pads, the same limit the archived /circuit/ demo met (`lessons/page-circuit.md`). Song Position Pointer is not read.

<a id="service"></a>

## `createCircuitDrumsService`

Verbs `cdrums.link`, `cdrums.unlink`, `cdrums.status`, each answered `cdrums.state`: `held`, `link`, `reading`, `counts` (`read`, `notes` on channel 10, `played`, `refused`, `offs`, `sysex`, `dropped` at the link: every synth note, CC, program change), `reasons`, `lat` (read off the input to the hit handed to scsynth, the last 512), `clock` (`bpm` from the last 96 ticks, `playing`, `aligned`, `step`, counts) and `grid`. No field is a wire envelope name; the test passes every answer through `format()`.

<a id="board"></a>

## in `board.mjs`

One service per board. While the link is held the screen is the grid's: the sequencer runs without drawing, and `screen.steps`, `screen.patch`, `oled.text` and `screen.note` from a page are refused in words (`screenTaken()`), and the camera on the screen sees no panel. `cdrums.beat()` rides on `board.hello` and `board.alive` as `cdrums: { held, played, refused, bpm }`, and `cdrums.state` goes to the room once a second while hits go through.

Pushed 2026-10-15 to the Pi at 192.168.1.213, md5s matching, service active. `cdrums.link` on the real board was REFUSED, correctly: *"pi-1:circuit:midi-out is not on this board: is the Circuit plugged in?"*, because the Circuit was not plugged into the Pi then (`/proc/asound` had the Fast Track Pro, the C925e and the MK-425C, no `Circuit`). So nothing about the real Circuit's out on this path is measured yet: whether its sequencer's notes come out on channel 10, whether it sends Start, the read to hit time on the Pi.

<a id="test"></a>

## `circuit-drums-test.mjs`

48 asserts. The grid on a fake clock (Start, a hit late in a step landing on the next, a bar wrapping, Stop holding, the first hit aligning with no Start); the service on a fake read (drums 1 to 4 play kick, snare, closed hat, open hat; running status; synth notes, a channel 10 note outside the map, a drum CC, a program change and SysEx play nothing; Start and a bar of ticks at 122 bpm draws steps 0 to 15 and reads 122 bpm; nothing redraws after Stop; refusals counted; unlink lets go of the read; no Circuit or no SuperCollider refuses naming the port); and the real `createInputs` over a fake raw port (the link opens the input once, a kick read off it plays one hit, nothing is written, no macro is queued for the room without a page's lease, unlink closes the input).

SABOTAGED 2026-10-15: ignoring `FA` took 1 assert red (aligned by Start); pushing the macros to the room without a lease took the lease assert red; dropping the read back's channel filter in bay.mjs took 4 bay-test asserts red (`lessons/kit-bay.md#drummap-back`).
