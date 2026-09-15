# plan-radio — `/radio/`, what it is and where it goes

Written 2026-09-14, session 24, after building it. The page is live and green;
this records the decisions, the measured prices behind them, and the one thing
that is parked and why — so none of it gets re-litigated from scratch.

**Live: <https://positron.studio/radio/>** · 21/21 green against the deploy.

---

## 0. Why this exists and why it is not `shout`

`shout` asks *what does Cloudflare cost in front of an Icecast stream*, measured
on the national broadcaster's output. Every ERR mount is already HTTPS and
would play in an `<audio>` tag with or without our relay, so there the relay
only adds **measurability**.

`radio` is a station somebody actually runs — one Icecast mount belonging to
the Estonian Centre of Contemporary Music — and it is here because of a
difference in kind:

🔴 **Their mount is plain HTTP on port 8001.** A page on `positron.studio` may
not load it at all: the browser refuses the mixed-content fetch **before any
CORS question is asked**. So on this station the relay is the difference between
a page that works and a page that cannot exist — not between one that measures
and one that does not.

That is the whole argument for a second page rather than a second default on the
first. ⚠️ The default on `shout` WAS switched to `radio` for about an hour
and switched back; a shared relay is not a reason to share a page.

---

## 1. The chain, end to end

    live.uuu.ee:8001/radio          Icecast 2.4.4, MP3 128 kbit/s 44.1 stereo
      │  http, no TLS, no CORS
      ▼
    workers/shout  (positron-shout)      allowlisted mount, one named entry
      │  https + access-control-allow-origin: *   + every icy-* header exposed
      ▼
    shout.positron.studio/radio.mp3
      │
      ├─▶ <audio crossOrigin="anonymous">  ──▶ MediaElementSource ──▶ analyser ──▶ dry ──▶ speakers
      │        │                                    │
      │        └─▶ mediaMaster ──▶ deck ──▶ transport bar (absolute, scrub:false)
      │                                             └─▶ grain-scope.feed()  (the wave)
      │
      └─▶ fetch(?bytes=2M, Icy-MetaData:1) ──▶ icyDemuxer ──▶ track titles + rate + gaps

Two connections to the same station, on purpose: the element **plays** it, the
fetch **reads** it. Only the second can count bytes, time gaps, or see the
in-band text channel — and only because the relay adds CORS.

---

## 2. The decisions, and what each one cost to learn

**The relay carries the mount by name, never by parameter.** `workers/shout`'s
allowlist went from `id -> path` against one `ORIGIN` constant to `id -> full
URL`, because a single origin is a shared mutable global of the same family as a
fixed port: a property of the first caller silently imposed on the second. An
unbounded URL parameter would make the worker a bandwidth laundromat, and the
account's egress is the project's.

**The transport is the only control, and it really controls the stream.**
🔴 `mediaMaster` runs ONE WAY — its own doc says *"a paused/ended master pauses
the deck, and a running one resumes it"* — so the element drives the deck and
nothing drove the element. Pause stopped the playhead and the radio played on: a
transport bar lying about the one thing it is for. **Reported by pressing it,
not by a check.** There is now a 1 Hz mirror in the other direction and an
assert, `the transport can stop the stream`.

**No strip.** A strip is a picture of a span you can move around in, and an
Icecast stream has no past to move around in. Every mark on it would have said
what the clock already says, in more space. `scrub: false` on the bar for the
same reason: a scrub here is a control that cannot do what it looks like it does.

**No `Listen` button.** It sat beside a transport bar that also has a play
button — two controls for one action, and the reader has to guess which is real.

⚠️ **Removing it cost two harness lessons worth keeping.** First, the page must
listen for `click`, not `pointerdown`: `verify.mjs` drives it with
`document.querySelector('.tbar-toggle').click()` and dispatches no pointer
events at all, so a pointerdown hook works under a finger and never once under
the harness. Second, the harness exercises play → pause → seek BEFORE anything
else and hands over a **paused** deck; the page follows it faithfully, so the
first run read `t=0.00s`, `peak rms 0.0000` and `heardFrom null` — three
failures that were one fact, and the fact was correct behaviour.

**The readout is four cells and every one moves.** `heard · kbps · gap · behind`.
⚠️ `loudness` was removed on sight: it rewrote itself sixty times a second,
which is the readout version of the caption that reflowed under `grain-scope`.
The level is still MEASURED — it feeds the assert that catches a tainted
graph — it is simply not displayed.

🔴 **`behind` is the cell this page earns.** An Icecast mount has no past, so
pausing does not hold your place: it drops you, and resuming rejoins at the live
edge while the seconds you missed stay missed. It sits still while you listen
and grows while you do not, which is exactly when it matters.

**The rate is measured after the burst.** Icecast hands a new listener ~64 KiB
faster than realtime to prime their buffer, so the first reading of a 128 kbps
station is comfortably in the 180s — MEASURED here at **185** before this was
fixed, and `shout` reads 195 over seven seconds for the identical reason. The
steady rate is taken from 40 % of the window onwards; the whole-window mean
stays in the log, because the difference between the two IS the burst.

**Every assert lands in one burst.** `verify.mjs` waits for the FIRST assert as
long as `settleMs` allows, then stops 400 ms after the count last GREW, capped
at twelve such windows. Checks spread across a six-second listen are checks the
suite stops collecting at the first quiet gap. MEASURED: with the radio
asserting on its own schedule the run read `10` and five later checks were
silently dropped — a page reporting less than it knows.

---

## 3. What it reuses, and what it put back in the kit

Uses: `shell.mjs`, `transport-bar.mjs`, `grain-scope.mjs`, `timeline/transport.mjs`,
`timeline/media-master.mjs`.

**`demo/shell/icy.mjs` — new, and LIFTED rather than copied.** The
SHOUTcast/Icecast in-band text demuxer lived inside `shout`'s page; this page
needed the same forty lines. `shout` now imports it too, so there is one copy.
`icy-test.mjs` feeds it a synthetic stream at **fourteen chunk sizes down to one
byte** — the case where a title straddles a boundary and a naive parser drops it
silently — plus a no-metaint case and a sabotage control proving the test can
fail. 14/14.

**`demo/shell/scsynth.mjs` and `demo/shell/pappus.mjs` — new**, for §4.
`demo/grains/engine.mjs` boots from the first one; grains re-verified **23/23
against the live board** after the refactor, same as the baseline taken before it.

---

## 4. 🔴 The granulator is PARKED, and it is parked for a measured reason

The page was to grow a `Synthesize` button handing the radio to real
SuperCollider — the board's own compiled Pappus graph, running in the tab,
chewing a live station instead of a test tone. It is written, and it is not
shipped.

**What works:** engine up in **531 ms**, 48 kHz; `pappus-tiny.scsyndef`
**64,733 B taken in 22 ms**; 31 of 31 buffers allocated; `/s_new` answers
`/n_go`; grains fire and are **reported by the engine that fired them**.

**What does not:** no audio reaches the graph. An isolated A/B — a 220 Hz
sawtooth at gain 0.3 connected straight into the engine — measured
**`withTone 0.00000, withoutTone 0.00000`**, with the context running and the
same meter reading ~0.07 in grains. So it is not the radio, and not the meter.

⚠️ **This does not contradict anything grains claims.** Grains has NEVER used
the input bus: `posSource` is a second synth started with `'out', 2` that writes
the bus from INSIDE scsynth, and Pappus reads it. No browser audio ever crosses
into the engine. `engine.mjs:57-64` says so outright and LESSONS #81 ships it as
the standing caveat. The input path was never used, never tested and never
claimed — what this did was measure it for the first time.

**Two real defects were found and fixed on the way, both now in the kit:**

- 🔴 `sonic.node` is a **frozen façade**, not an AudioNode —
  `Object.freeze({connect, disconnect, get context, get numberOfInputs, …, get
  input(){return e}})`. Its `connect` forwards, so `sonic.node.connect(x)` works
  and reads like an AudioNode, while `x.connect(sonic.node)` throws `Overload
  resolution failed`. It passes every duck-type check you would think to write.
  `sonic.node.input` is the real one — and `engine.mjs`'s comment had NAMED that
  property all along, as API rather than metaphor.
- 🔴 **Pappus fires nothing without its buffers.** 31 of them: 17 envelope
  windows and 2 gate buffers among them. It loads, answers `/n_go`, and is
  silently inert. Unallocated buffers are not an error to scsynth, they are
  silence.

⚠️ And one comment was written claiming an `audio: {inputChannels}` override
fixed something. It did not: the SuperSonic subclass DERIVES that from
`numInputBusChannels`, whose default is already 2. The no-op was removed rather
than left looking load-bearing.

A background investigation is open on whether live input is reachable at all in
this build — instrumenting the worklet's copy branch, checking whether anything
zeroes the input bus per block (`realTime: false` is the suspicious default),
consulting upstream, and pricing the fallback: pumping captured PCM into a
scsynth BUFFER with `/b_setn` and granulating that instead of a bus. Its report
lands in `research/scsynth-live-input-2026-09.md`.

**The button does not ship until sound comes out of it.** A control that boots
an engine and produces silence is the inert control CLAUDE.md forbids.

---

## 5. Order of work

| | | why |
|---|---|---|
| **P1** | land the input-bus answer from the investigation | everything below waits on it |
| **P2** | if reachable: `Synthesize` + the four Pappus sliders (rate, size, scan, spray) and a dry/wet blend | the page's reason to exist beyond a player |
| **P3** | if NOT reachable: the `/b_setn` buffer route, or say plainly on the page that the browser cannot be fed | an honest "we cannot" beats a button that lies |
| **P4** | the scope's second mode — `buffer()` + `mark()` instead of `feed()` | only meaningful once grains read real material |
| **P5** | a check that drives the DOM event rather than the handler | positron-91 shipped four fixes for an adjacent thing because `playTile(i)` passed while clicking did nothing |

---

## 6. Priced and rejected

- **A copy of `shout`.** Same relay, different subject; a copy would have been
  two pages drifting apart. The manifest row carries the difference in one line.
- **A second row pointing at `/shout/?station=radio`.** Cheap, and redundant
  once this page does something `shout` does not.
- **Putting the granulator behind a disabled button "for now".** A greyed
  control still makes a promise. Nothing ships until it sounds.
- **Copying `pappus-tiny.scsyndef` into this demo.** `checkCompiledDefs()`
  guards the md5 of the one under `/grains/defs/`; a second copy could go stale
  in silence, which is the exact failure that check exists to refuse. One
  definition, fetched cross-page, and `checkVendorUrls()` refuses the build if
  the path ever stops resolving.
