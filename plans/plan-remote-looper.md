# The remote looper, and the distributed instrument behind it

Answers two messages, 2026-09-24:

> *"in bg, plan the "remote looper" feature. I am in desktop browser, midi keyb
> connected but i want mobile browser on same webpage have 3x3 grid buttons to
> toggle the looper"*

> *"think wider of distributed instument (parts) like this"*

🔴 **THE SECOND MESSAGE IS THE LARGER HALF AND THIS DOCUMENT IS ORGANISED
AROUND IT.** Section 1 is the pattern. Sections 2 to 9 are the remote looper,
which is its first instance. Section 10 names instances two and three and prices
them. A reader who only wants the phone grid can start at section 2, and a
reader deciding whether to build any of it should read section 1 and section 11.

🔴 **NOTHING IN THIS PLAN HAS BEEN BUILT AND NO PHONE HAS BEEN OPENED.** Every
fact about this repository was taken off the files today. Every number about the
relay was measured earlier by this project and is quoted with the date it was
taken and the harness that took it. **Not one measurement in this project
describes a phone's leg to the relay**, so section 3 says so in those words and
section 3.4 names exactly what would turn it into a fact.

| mark | means |
| --- | --- |
| **MEASURED** | a number taken off a running thing on this desk today, with the command that took it |
| **RECORDED** | a number measured earlier by this project and read out of a standing file today, with the date it was taken |
| **READ** | a fact taken off the source in this repository today |
| **INFERRED** | a conclusion drawn from two of the above and stated by neither |
| **UNSETTLED** | a question this plan could not answer, listed in section 11 |

---

## The short answer

**One URL. `?role=controls` makes it the phone. Anything else is the sound.**

**The phone sends a PRESS and never a state, and it holds no copy of the state
machine.** There is exactly one `numloop` in the system, inside `createKeyboard`
on the machine that holds the takes, because the takes cannot leave the browser
they were played into.

**The desktop broadcasts all ten states on every change and every 2 s.** A full
state rather than a delta, so a lost message repairs itself inside one heartbeat
and no edge has to be perfect. `plan-controller.md` §4.1 already calls its own
version of this *"the entire repair for the only failure that matters"*.

**The grid is a 3x3 of slots 1 to 9 with slot 10 in a fourth row**, which is
`createPadGrid({ cols: 3, rows: 4 })` with two disabled blanks beside it. That is
the same call `/num/` and `/evo/` already make, the 3x3 that was asked for is
there, and no slot is silently dropped. Section 2.3 has the argument.

**The new shared code is one kit module, `demo/shell/part.mjs`**, which owns the
seam and owns no instrument. It brings the room, the role, the census, the
de-duplication, the state ordering and the presence, over `openWire`. It does not
know what a loop is.

**A press costs the double press window plus one round trip.** RECORDED
2026-09-17, 120 samples: a round trip through the room's Durable Object is **p50
42.3 ms at one socket**, of which **6.0 ms is the object and the rest is that
laptop's link to the edge**. The window is 250 ms and is what a local press
already costs. **So on the measured link the relay adds about 17 per cent to a
cost the looper already pays.** INFERRED, because no phone has been measured.

**And the pattern behind it is one sentence: the part that makes the sound owns
time, and everything else sends gestures and receives pictures.** Section 1.3.

---

## 0. What this inherits, so nothing is decided twice

Every row was read today. **These are decisions, not opinions, and this plan
follows all of them.**

| decision | where | what it settles here |
| --- | --- | --- |
| *"the room stays in the URL and `channel` is not added"*, decided 2026-09-09 | `plan-ws.md` §5 | the rendezvous is `?room=`, and there is no second filter |
| *"No order across rooms. The echo is the ordering point and it is per-DO. That is the test for when to split: same order, same room"* | `plan-ws.md` §5 | presses and states share one room, because they must share one order |
| *"The `at` stamp is the sender's clock. Across devices it carries their clock error"* | `plan-ws.md` §8 | the lap is never corrected with the phone's `Date.now()`. Section 3.3 |
| *"`performance.now()` is private to a document. Two of them are not comparable, at all, ever"* | `plan-jam.md` §6 | there is no shared position inside a lap. Section 4 |
| **`?role=loopback \| pub \| watch`**, and the page prints `pair it with ?role=watch&ns=…` | `demo/moq/index.html:24,133` | the precedent for a role in the URL, and for a page printing its own pairing line |
| **`role=host` / `role=player`** on the socket URL, with `online` and `busy` *"derived from live sockets, never stored flags"* | `workers/instrument/src/index.js` | the second role-in-URL precedent, and the contrast in section 2.1 |
| *"A full statement every 500 ms"* is *"the entire repair for the only failure that matters"*, and separately **"No per-message ack"**, which its options table prices as *"doubles the traffic, and is the wrong shape"* | `plan-controller.md` §4.1, §4.2, and the table at line 291 | the heartbeat carries a full state and nothing is acknowledged |
| *"Relay only edge events"*, because a DO broadcast fans out by N | `plan-m2m.md` §5 | nothing continuous crosses this seam |
| *"no default"* room name, because a friend following the instructions lands in `studio-1`, which is our room | `plan-portable-board.md` §3.2, §3.3 | no default room. Section 2.2 |
| *"the room namespace is guessable and tokenless"*, and sharing our relay is *"fine for one friend trying it out for an evening. Not production"* | `plan-portable-board.md` §7.1 | the residual risk in section 2.2, stated rather than solved |
| *"`webSocketClose()` is an empty method, so nobody is told when somebody leaves"*, and `/stats`'s `idleMs` is anonymous | `plan-portable-board.md` §4.4 | presence is by heartbeat, never by a leave event. Section 4 |
| *"The pressed state comes from the NOTE, not the input"*, and *"Do not let the on-screen keyboard become a second source of truth for what is playing"* | `plan-instrument.md` §3, §5 | the phone's fill is painted from what came back, never from its own press. Section 2.4 |
| *"A demo whose subject cannot appear for a visitor is a page that reads as broken, and the suite would assert nothing on the leg that matters, which is exactly how `moq` and `ladder` asserted NOTHING for weeks behind a plausible excuse"* | `plan-instrument.md` §4 P4 | the bench must be worth opening with one device. Section 7.2 |
| **Safari has no Web MIDI on any platform**, VERIFIED from caniuse, WebKit bug 107250 open since 2013-01-18 | `plan-nola.md` §1.1 | an iPhone cannot be the sound part with a keyboard plugged in, and `caps.mjs` already reports `midi` softly. Section 2.1 |

⚠️ **AND ONE OF THEM LOOKS LIKE A CONTRADICTION AND IS NOT.**
`plan-instrument.md` §2 refuses a role flag in these words: *"A parameter that
switches which demo you are is not a shared component, it is two components in a
trenchcoat."* That is about two pages making two different CLAIMS, which is why
that plan keeps `/looper/` and `/instrument/` as two demos. **`?role=` here does
not switch which demo you are. Both halves make the same claim about the same
instrument and neither is a demo on its own**, which is exactly what `/moq/`'s
`?role=pub` and `?role=watch` already are. Recorded here so nobody re-litigates
it from half the quote.

---

## 1. The pattern: what an instrument splits into

### 1.1 The six parts

An instrument on this desk is already six things. Naming them is what makes the
phone grid an instance rather than a one-off.

| part | what it holds | which device is good at it | who already does it here |
| --- | --- | --- | --- |
| **sound engine** | the graph, the samples, the voices | a real CPU with WebAudio, or the Raspberry Pi, or the Circuit | `/nola/`, `/knobs/`, `/grains/`, the Circuit |
| **control surface** | nothing at all. A set of momentary gestures | a phone (it is in your hand), a MIDI controller, a foot | the MK-425C number pad, `/num/`'s keypad, `/twelve/` |
| **display** | a picture derived from state it does not own | a phone on a stand, a second monitor, a headset | `/mirror/`, `/circuit/`, `/evo/` |
| **recorder** | a tape of movements, or of audio | wherever the movements originate | `createKeyboard`'s ten takes, `/record/`, `/capture/` |
| **clock** | when things happen | **always the device making the sound** | `runTake`'s absolute anchor, the board's own graph |
| **score** | what is supposed to happen | anywhere. It is a document | `/sound/`, `/held/`, `/nola/`'s chord line |

⚠️ **A PART IS NOT A FILE AND NOT A COMPONENT.** `createKeyboard` is three parts
in one object: a control surface (the keys), a recorder (the takes) and a clock
(`runTake`'s anchor). That is why its comment says the tape attaches at
`lightNote`, which is the one funnel every route passes. Splitting an instrument
means deciding which of the six go on which device, not moving files.

### 1.2 What a seam has to carry, and which are cheap

🔴 **A SEAM IS CHEAP IN PROPORTION TO HOW LITTLE CROSSES IT PER SECOND AND HOW
MUCH LATENESS IT CAN ABSORB.** Those are two different questions and only the
second one decides anything.

| seam | bytes a second | lateness it can absorb | verdict |
| --- | --- | --- | --- |
| surface to engine (a press) | about 40 bytes, a few a second | the transport already waits 250 ms to decide | **cheapest there is** |
| engine to display (a state) | about 150 bytes twice a second | a picture a frame late is a picture | **cheap** |
| engine to display (a position inside a lap) | 40 bytes at 10 Hz | none. A jumping playhead is worse than no playhead | **starts costing** |
| surface to engine (a continuous value) | RECORDED: one knob turn is about 60 messages a second on its own | a value 30 ms late is a value, but two writers is a fight | **costs a rule, not bandwidth** |
| audio | 1.4 Mbit/s at 16 bit stereo | none. Every millisecond shows | **expensive, and it has WHEP and MoQ already** |
| a shared clock | almost nothing | **none, because lateness IS the product** | **refuse it** |

⚠️ **THE BANDWIDTH COLUMN IS NEARLY IRRELEVANT AND IT IS THE ONE PEOPLE REACH
FOR.** RECORDED 2026-09-09 by `demo/perf-wire.mjs`: the relay carries 1 KiB at
p50 47 ms and 256 KiB at 125 ms, and delivers 900 of 900 into a fifteen socket
room. RECORDED 2026-09-17 on `studio-1`: the Raspberry Pi's audio is 92.4 KiB/s,
which is **4.9 per cent of the 1000 msg/s cap and 1.1 per cent of the 8 MiB/s
one**. READ off `workers/relay/src/index.js` today: 128 sockets, 1000 messages a
second with a 2000 burst, 8 MiB/s per socket, just under 1 MiB per message.

**A press is 40 bytes. Nothing in this pattern is within two orders of magnitude
of a limit, and the limits are not what decides anything.**

### 1.3 The one rule that falls out

🔴 **NEVER SPLIT THE CLOCK. THE PART THAT MAKES THE SOUND OWNS TIME, AND
EVERYTHING ELSE SENDS GESTURES AND RECEIVES PICTURES.**

The evidence is already here. RECORDED in `PROGRESS.md` and `plan-jam.md` §4: a
Mac and a Pi on one relay measured 64 to 69 ms apart and **about 10.4 ms out by
NTP**, and they only agreed to **2.7 ms** after a peer correction was built for
it, over 455 samples each across 180 s. `plan-jam.md`'s own quoting rule is
*"Quote 3 ms, never 0.15"*, because the 0.15 figure was two Chromes on one Mac.

And `keyboard.mjs` already says what a drifting anchor costs: *"ten laps of 4 ms
late is 40 ms, a hundred is nearly half a beat, and the phrase walks away from
itself while each individual timer looks fine"*.

✅ **THE COROLLARY IS WHAT MAKES THE WHOLE PATTERN CHEAP.** If the engine owns
time, a surface has nothing to synchronise. It sends a press, which is a fact
with no time in it, and receives a state, which is a fact with no time in it
either. **That is why the cheapest seam in the table is the one the ask wants.**

### 1.4 What already exists, so nothing is rebuilt

READ today:

- **`workers/relay/src/index.js`**, a tokenless verbatim relay at
  `wss://ws.positron.studio/room/<name>/ws`, one Durable Object per room via
  `idFromName`, echoing every message to every socket including the sender. Its
  header calls the echo *"the loopback-through-server ordering point, not an
  accident"*, and says it **never re-stamps**, because a relay's idea of now
  measured plus or minus 50 ms of bias.
- **`demo/shell/wire.mjs`**: the envelope `type`, `from`, `at`, `seq`, plus
  anything the sender wants. `openWire` reconnects, mints a NEW `from` per
  connection, counts gaps per `from`, and declares `by: 'tool'` automatically for
  any page opened with `?selfcheck=1`. It **throws** if a payload field is named
  `from`, `at`, `seq` or `by`. ⚠️ Its exported `LIMITS` is the stale copy that
  `plan-controller.md` §1.3 reports as wrong by up to 16.7 times. **Ask `/stats`,
  do not read `LIMITS`.**
- **`demo/shell/presence.mjs`**: four states, `presenceOf` as a pure function
  graded by `presence-test.mjs`, `MISSES = 2`, and the rule that `lastSeenAt` is
  **when you heard it, not the stamp inside the message**.
- **`demo/shell/pad.mjs`**: `createPad` and `createPadGrid({ cols, rows, pad,
  onPress })` with `grid.at(x, y)`. `/num/` and `/evo/` both draw a telephone
  keypad with it.
- **`demo/shell/field.mjs`**: the kit's text input, and its own header already
  names this case, *"a one-line field here holds a VALUE that has to round-trip,
  a room name, a URL, an id, so autocorrect, autocapitalize and spellcheck are
  off"*. ⚠️ **No relay page uses it for a room yet**, so this would be the first.
- **`demo/shell/numloop.mjs`**, the four state machine, ten instances, one timing
  window. **MEASURED today: `node demo/shell/numloop-test.mjs` is 15 ok, 0
  failed.**
- **`createKeyboard`**, which holds the ten takes, puts `Loop` left of `Sustain`,
  and exposes `loops.press(i)`, `loops.settle(i)`, `loops.clear(i)`,
  `loops.states()`, `loops.lap(i)`, `loops.tape(i)` and `loops.slots`.
- **`demo/verify.mjs`**, which already gives every harness run a private room,
  `room=<demo>-test-<hash>`, unless the manifest says `room: 'fixed'`. READ
  today, the fixed rooms are `mirror`, `wire`, `able`, `grains` and `knobs`.

The pages that already put two machines in one room, READ today:

| page | role split | role from the URL? |
| --- | --- | --- |
| `/moq/` | `pub` publishes, `watch` receives, `loopback` is both | **yes**, `?role=` plus `?ns=`, and it prints its own pairing line |
| `workers/instrument` | `host` holds the instrument, `player` plays it | **yes**, `role=` on the socket, and two separate HTML files |
| `/instrument/` | symmetric. Whichever page presses *Hear the other machine* becomes the listener | no. A button decides |
| `/stage/` | audience, control room, archive | no. Three tabs inside one URL |
| `/grains/`, `/knobs/`, `/mirror/` | browser is the surface, the Pi is the engine | no. The hardware decides |
| `/jam/`, `/room/`, `/blocks/`, `/cues/` | symmetric, no roles at all | no roles to choose |

---

## 2. The remote looper, instance one

### 2.1 Role: one URL, and `?role=controls` decides

**One URL.** *"mobile browser on same webpage"* is the ask, and it is also the
right answer: two URLs means two pages to keep in step, and the one that goes
stale is the one nobody opens.

**The rule is one line: a page is the SOUND part unless its URL says
`role=controls`.**

- The desktop opens `https://positron.studio/<slug>/` and is the sound.
- It mints a room code on a press and writes it into its own URL with
  `history.replaceState`, so a reload keeps the room.
- The line it prints is `pair it with ?room=<code>&role=controls`, which is
  `/moq/`'s line one instrument along.
- The phone opens that and is the surface.

🔴 **AND A SECOND SOUND PART IN ONE ROOM STANDS DOWN IN WORDS RATHER THAN
FIGHTING.** A page that joins as the sound and hears `part.here` from another
sound part **does not take the room**: it says so in its log, keeps its own
keyboard working locally, and offers one button to become the surface instead.
That is an allowlist of ONE, decided by the object rather than by a name test,
and **the default is to stand down**.

⚠️ **AND `workers/instrument` DECIDES THE OPPOSITE, WHICH IS WHY THIS IS WRITTEN
DOWN RATHER THAN ASSUMED.** READ today: there, *"a second host socket for the
same instrument replaces the first (closed 4001, emits no ghost events)"*. That
is right when the host is a registered instrument and the newest claimant is
presumed to be the live one. **It is wrong here, because the first sound part
holds TAKES.** Replacing it would leave loops playing on a machine nothing can
reach, which is the failure section 4 exists to prevent.

🔴 **AND THE TWO SOUND PARTS FAILURE IS NOT A GUESS. IT HAS BEEN MEASURED, IN
THIS PROJECT, IN THIS EXACT SHAPE.** `plan-portable-board.md` §3.2 records what
two Raspberry Pis in one room did: the page's idea of which board was speaking
**flapped twice a beat**, each board's sequence started at 0 so *"the page's
`lost` counter is meaningless"*, and *"Every verb reaches both boards. There is
no target field."* **That is precisely what two sound parts would do to a
phone**, and it is the argument for section 2.1 in measured form.

**Why not role by arrival, the way `/instrument/` does it.** Two desktops opening
the plain URL a second apart would both find an empty room and both claim it, and
the surface would then receive two contradictory states with no way to tell which
is real. Role by arrival is a fact about network timing; role by URL is a fact
about what somebody opened, and only the second is reproducible.

**Why not sniff the device.** `positron-ui` records it as a rule with a
measurement behind it: `caps.mjs` is *"a capability test, never a user-agent
check"*, because a Quest 3 and a 3S are indistinguishable by user agent. A phone
with a USB MIDI keyboard is a legitimate sound part and a desktop with a
touchscreen is a legitimate surface. **Nothing branches on what kind of device
this is.**

⚠️ **THOUGH ON AN IPHONE THE QUESTION IS ALREADY ANSWERED BY THE PLATFORM.**
`plan-nola.md` §1.1, VERIFIED from caniuse: **Safari has no Web MIDI on any
platform**, not desktop 3.1 through 27.1 and not iOS 3.2 through 27.2, and
**WebKit bug 107250 has been open since 2013-01-18**. So an iPhone can be the
sound part with its own on-screen keys and can never be the sound part with a
keyboard plugged in. `caps.mjs` already treats `midi` as SOFT, so nothing new is
needed and nothing is blocked. **This is a reason the surface role suits a phone,
not a reason to branch on one.**

### 2.2 Rendezvous: a six character code, and a QR later

**No default room**, following `plan-portable-board.md` §3.3, which refuses one
for the same reason in the same words: a friend who follows the instructions ends
up in `studio-1`, *"That is our room."* Every other relay page here has a default
and for those it is right, because the room is either a rendezvous for strangers
(`cues-demo`) or the address of a machine (`studio-1`). A looper is neither: a
default room means two strangers who both press Join are toggling each other's
takes.

**The code is six characters from a 32 symbol alphabet with no `0`, `O`, `1` or
`l` in it.** That is 1.07e9 rooms, it types in about four seconds, and it fits the
relay's own room regex, READ today as `[a-zA-Z0-9_-]{1,64}`.

**The desktop shows three things as one box**: the code in large mono, the full
URL as selectable text, and how many parts are in the room. **The phone types the
code into `createField`**, which already turns autocorrect, autocapitalize and
spellcheck off for exactly this.

🔴 **THE RELAY IS TOKENLESS AND THIS IS THE RESIDUAL RISK, STATED RATHER THAN
HIDDEN**, in the same voice `plan-portable-board.md` §7.1 already uses: *"the room
namespace is guessable and tokenless"*, and our relay is *"fine for one friend
trying it out for an evening. Not production."* Anybody who guesses a code joins
the room and can press the loops. What bounds it: a guess is one in a billion, no
audio and no tape ever crosses the seam so there is nothing to overhear, and the
census is on screen so a third socket is visible rather than silent. **What does
not bound it: nothing.** There is no authentication on this relay, and adding one
means a token in a public page, which is the exact thing `workers/relay` was
written to avoid.

**A QR code is the right second step and it is cheap on the generating side.** The
phone's camera is the scanner and that is the operating system's job. What is
missing is an encoder: **READ today, there is no QR library anywhere in this
repository**, and `demo/shell/vendor/` holds a font, two Quest controller models,
the scsynth WASM and the clockwork worklet. The URL is about 60 characters, which
is inside a version 3 QR at medium correction, INFERRED from the format rather
than generated. **Build the code first**, because it works when the phone cannot
see the screen and it costs no dependency at all.

### 2.3 Which nine of ten, which is a real decision

The looper has ten slots. `createKeyboard`'s `Loop` button is slot 1, and the
MK-425C's ten pads reach all ten, MEASURED off the wire 2026-09-23 and recorded
in `/nola/`: programs 1 to 9 are slots 1 to 9, and **the pad's `0` is program 0,
which is slot 10**. Nine buttons for ten slots drops one.

**The three ways out, and what each costs:**

1. **Drop slot 10 from the phone.** Cost: **a running loop that the thing in your
   hand cannot stop.** That is the worst of the three, because the surface exists
   so your hands do not have to leave the keyboard, and the one moment you reach
   for it is the moment something is running that should not be.
2. **Make the looper nine slots when a surface is attached.** Cost: it changes a
   machine with 15 passing checks and breaks a hardware mapping that was measured
   off the wire. Refused.
3. **Draw the 3x3 that was asked for and put slot 10 underneath it.** Cost: one
   extra row of pad height on the phone.

✅ **RECOMMENDED: 3.** `createPadGrid({ cols: 3, rows: 4 })`, the top three rows
are slots 1 to 9 in exactly the 3x3 the ask names, the bottom row is a disabled
blank, slot 10, a disabled blank. **That is literally `/num/`'s keypad with `−`
and `+` replaced by empties**: the same component call, the same telephone
arrangement a hand already knows, and nothing new to draw.

⚠️ **AND THE TWO BLANKS STAY DISABLED IN THE FIRST BUILD.** The obvious thing to
put there is `stop all`, and `numloop.mjs` has no such verb: the nearest thing is
the double press on an empty slot, which stops every other looping slot and
records, and that is a gesture rather than a button. Adding a verb to the machine
is a separate decision with its own check, and `/num/` already shows what a
disabled pad looks like.

### 2.4 What a button press means: a press, never a state

🔴 **THE PHONE SENDS A PRESS.** `{ type: 'loop.press', slot: 0..9 }`, and nothing
else. It carries no state, no timing and no opinion.

**The four things that can go wrong on a wire, and what each does to each
design:**

| | phone sends a PRESS | phone sends a STATE |
| --- | --- | --- |
| **message lost** | the button did nothing. The state that comes back is unchanged, so the pad visibly does not move, which is the truth | the state is never reached, and the next message repairs it. Self-healing |
| **message duplicated** | **the machine WALKS one extra step**, which is audible and wrong | a no-op. `enter` returns early when `was === next` |
| **out of order, same slot** | identical. A press has no content, so two of them in either order are the same two presses | the older state wins if it arrives later. Needs a counter |
| **out of order, different slots** | harmless. Ten independent machines | harmless |

**Each design has exactly one hole and they are different holes.** The press
design's hole is the duplicate, and **the duplicate is closed for free**:
`wire.mjs` already stamps every message with `from` (per connection) and `seq`
(per connection, monotonic). The sound part keeps the last applied `seq` per
`from` and refuses anything not greater. Nothing new goes in the envelope, which
is what the envelope is for.

The state design's hole is ordering, closable the same way, **but it has a second
and much worse cost: the phone would have to run the state machine to know what a
press means.** Two copies of a four state machine with a 250 ms timing window, on
two clocks, with the tape on only one side. This project's own repeated finding is
that a fact held in two places is a fact that will disagree, and it has repaired
it three times: `--sld-col`, the durations table, and `wire.mjs`'s own `LIMITS`,
which claimed to be derived from the worker and was wrong by up to 16.7 times.

⚠️ **AND THE DOUBLE PRESS SETTLES IT ON ITS OWN.** The double press is a TIMING
gesture: `numloop.mjs` holds every press for 250 ms to find out whether a second
one is coming. If the phone sent state, the phone would have to hold too, and
then the window and the network would add up across two clocks that
`plan-jam.md` §6 says are *"not comparable, at all, ever"*. With a press, **the
window is measured on one clock, on the machine that holds the tape**, and the
jitter is inside the window rather than beside it.

✅ **AND THE PHONE'S OWN LAMP IS WHAT MAKES A LOST PRESS HONEST.** `/num/` already
paints two channels: `data-touch` on the press and `data-st` on the state. On one
device that division is cosmetic. **On two devices it is load-bearing**, and it is
`plan-instrument.md` §5 one device along: *"Do not let the on-screen keyboard
become a second source of truth for what is playing."* The touch lamp says *this
phone heard you*, which is true whatever the network does. The fill says *the
loop is in this state*, and it is only ever painted from what came back. **A press
that was lost leaves the lamp on until the next state arrives, at most 2 s later,
and then the pad does not change. The person sees the truth, which is that
nothing happened.**

### 2.5 Where the state machine lives, and what is traded away

🔴 **ONE COPY, ON THE SOUND PART, INSIDE `createKeyboard`.** The phone holds no
machine and no timer. It holds the last ten words it was told, and a lamp.

**Why not a copy each, kept in sync.** Section 2.4.

**Why not a copy in the Durable Object.** Three reasons and the first is fatal.

1. **The DO's copy would be a lie.** The takes are arrays of key movements in one
   browser's memory. A DO that believes slot 3 is `looping` while the browser
   holding that tape has reloaded is a state with nothing behind it, and it would
   paint a running loop on a phone that nothing is playing. **State cannot be more
   durable than the thing it describes.**
2. **It breaks the relay's one rule.** `workers/relay` is verbatim by design: no
   parse, no storage, no envelope. `plan-ws.md` §3 already decided this shape for
   the recorder, which *"joins the room as an ordinary socket"* and is allowed to
   parse **because it is not the relay**. A looper state object would be a third
   deployment for one feature.
3. **It buys nothing the heartbeat does not.** The case a DO would serve is a
   phone joining while a take is turning, and that is one `part.hello` and one
   reply.

**What is traded away**, stated plainly:

- The phone feels one round trip before the fill changes. RECORDED p50 42.3 ms on
  a laptop's link in 2026-09-17, unmeasured from a phone.
- A phone with no connection has a grid that does nothing, and it must SAY so
  rather than draw ten live-looking buttons. Section 4.
- The desktop reloading loses every take, and the phone must not go on painting
  fills for takes that no longer exist. Section 4.

### 2.6 The messages, in full

Five verbs. Every one rides `wire.mjs`'s envelope, so `from`, `at`, `seq` and `by`
are already there and **must not be named in a payload or `format` throws**.

| type | who sends it | payload | when |
| --- | --- | --- | --- |
| `part.hello` | any part, on joining | `{ is: 'sound' \| 'controls' }` | once per connection |
| `part.here` | any part, answering a hello | `{ is }` | on every `part.hello` from somebody else |
| `loop.press` | controls to sound | `{ slot }` | on a pad press |
| `loop.state` | sound to everyone | `{ states: [...ten words] }` | on every `onLoop`, and every 2000 ms |
| `part.ping` / `part.pong` | either | `{ n }` | section 3.3 |

⚠️ **THE URL PARAMETER IS `role` AND THE VERB FAMILY IS `part`, ON PURPOSE.**
`role=` follows the two precedents in section 0 so nobody has to learn a second
spelling for the same idea. `part.*` is named for the pattern, which is the word
the ask used.

**`loop.state` carries all ten, never a delta.** Ten words is about 150 bytes, so
the 2 s heartbeat is 75 bytes a second against 8 MiB/s. A delta needs the receiver
to have seen everything before it; a full state needs nothing, **so a missed edge
repairs itself inside one heartbeat and no edge has to be perfect.** That is
`plan-controller.md` §4.1's *"full statement"* argument, and it is worth far more
than the bytes. **Nothing is acknowledged**, by §4.2: an ack doubles the traffic
and is the wrong shape.

⚠️ **AND 2000 ms IS A JUDGEMENT, NOT A MEASUREMENT, AND IT DIFFERS FROM THE
PRECEDENT ON PURPOSE.** `plan-controller.md` chose 500 ms, because a meter is a
continuous value where being wrong is continuously wrong. A loop state is
discrete and is already sent on every change, so the heartbeat's only jobs are
dating the presence and repairing a missed edge. `presence.mjs`'s `MISSES` is 2,
READ today, so 2000 ms gives an `offline` verdict about 4 s after a phone drops.
The board beats at 5000 ms, which would mean 10 s, **and 10 s of a grid that lies
about a running loop is too long when the grid is in your hand.**

### 2.7 What is new code and what is not

**New: one kit module, `demo/shell/part.mjs`.** It owns the seam and owns no
instrument:

- reading `?room=` and `?role=`, and minting a code when there is none
- `openWire` underneath, so reconnect, per-connection `from` and the automatic
  `by: 'tool'` under `?selfcheck=1` all come free
- the census, and the **only one sound part** rule from section 2.1
- de-duplication by `(from, seq)` on receive
- refusing a `loop.state` whose `seq` is not greater than the last applied for
  that `from`, and **resetting that per-`from` when `from` changes**, which
  happens on every reconnect by design
- `createPresence` wired to the heartbeat
- `part.ping` and `part.pong` at the application level

It knows nothing about loops, slots, keys or audio. **The same division
`numloop.mjs` keeps with `keyboard.mjs`**, and it is what makes instances two and
three cheap.

**New: one bench page.** Proposed slug `/pair/`, proposed `one` line: *your phone
becomes the ten loop keys for a keyboard plugged into another browser*. The slug
is the user's to name.

⚠️ **THE BENCH COMES FIRST AND THAT IS THIS PROJECT'S OWN PATTERN FROM LAST
WEEK.** `/num/` was asked for in those words, *"can make a separate tmp demo too
get it right 'num'"*, and what it got right was a four state machine with a timing
window before any page had audio in the way. The same argument holds one layer up:
get the seam right with no sound, no MIDI and no takes, then fold it into a page
that has all three.

**Not new, and not to be touched**: `numloop.mjs`, `numloop-test.mjs`, `pad.mjs`,
`presence.mjs`, `wire.mjs`, `workers/relay`.

**Changed, by three lines**: the page with a keyboard. `/nola/` already owns MIDI
by `midi.mjs`'s one-path rule and already turns a program change into
`keys.loops.press(slot)`. A remote surface is the same wiring arriving by a
different road:

- on `loop.press`, call `keys.loops.press(slot)`
- on `createKeyboard`'s `onLoop`, send `keys.loops.states()`
- on the heartbeat, send `keys.loops.states()`

✅ **AND THAT IS THE WHOLE PAGE CHANGE, WHICH IS THE TEST OF THE DESIGN.**
`/nola/`'s own comment records the correction that produced it: *"do not wire
nola, its gloabl keyboard fn. nola gets just chords as if i played htem"*. A
remote surface that needed the page to know about laps, tapes or scheduling would
be the same mistake in a new costume.

---

## 3. Latency, and which half of it is a fact

### 3.1 What is RECORDED, and the two runs disagree

**RECORDED 2026-09-09**, `demo/perf-wire.mjs`, deployed relay, one Mac, 200
samples a figure, three runs:

| | run A | run B | run C |
| --- | --- | --- | --- |
| `ping` to `pong`, answered by the runtime, the object never woken | p50 26.0 | 36.4 | 37.5 ms |
| echo through the room's Durable Object | p50 27.0 | 38.0 | 38.3 ms |
| **the object's own cost** | **+1.0** | **+1.6** | **+0.8 ms** |

**RECORDED 2026-09-17**, `plan-portable-board.md` §5.5, 120 samples each,
sequential, sender is socket 0:

| sockets in the room | `ping` to `pong` | echo through the object | the object's own cost |
| --- | --- | --- | --- |
| 1 | p50 36.3, p95 44.7 | p50 42.3, p95 52.0 | **6.0 ms at p50** |
| 4 | p50 35.8, p95 48.2 | p50 41.7, p95 56.0 | **5.9 ms at p50** |
| 16 | p50 39.1, p95 57.2 | p50 46.3, p95 74.2 | **7.2 ms at p50** |

🔴 **THESE TWO DISAGREE BY A FACTOR OF SIX ON THE HOP AND THE DISAGREEMENT IS
REPORTED RATHER THAN RESOLVED.** `plan-portable-board.md` flags it in its own
words: *"CLAUDE.md records 1 to 2 ms for the hop and 8 ms for a full 16-socket
room; today's hop is 6 ms and today's room-size cost is 1.2 ms. Both were measured
honestly on different days from different networks."* **This plan quotes the newer
pair, because it is newer and because it is the pessimistic one**, and it does not
pretend the older one was wrong.

⚠️ **AND THE ABSOLUTE NUMBER IS THE LINK, NOT THE RELAY.** It moved 11 ms across
the 2026-09-09 runs alone. `PROGRESS.md` names the error being avoided: quoting
the autoresponse round trip as the relay's latency is the same mistake as quoting
`candidate-pair` RTT as media latency, which flattered WHEP by about three times.

### 3.2 What a press costs, built out of those numbers

A press on the phone reaches a fill on the phone in three parts:

1. **phone to desktop**: one one-way trip. INFERRED as half of 42.3 ms, so about
   21 ms, and **the half-of-a-round-trip assumption is wrong whenever the path is
   asymmetric**, which a phone's uplink usually is.
2. **the double press window**: **250 ms, and it is not the relay's fault.**
   `numloop.mjs` holds every press that long to find out whether a second one is
   coming, and `/num/` asserts it: *"a single press costs the double press window
   before it takes effect"*, reading `late >= DOUBLE_MS && late < DOUBLE_MS + 200`.
3. **desktop to phone**: one more one-way trip.

**So press to fill is about 292 ms on the measured link against 250 ms for the
same press made locally. The relay adds about 17 per cent to a cost the looper
already pays, and the 250 ms dominates it by an order of magnitude.**

⚠️ **AND A BUSY ROOM CHANGES ALMOST NOTHING.** RECORDED 2026-09-17: going from 1
socket to 16 costs the sender **1.2 ms at p50**, though **about 22 ms at p95**.
Two sockets is this feature's ordinary case.

### 3.3 The one place the trip is not absorbed

🔴 **THE CLOSING PRESS STRETCHES THE LAP BY ONE ONE-WAY TRIP.** READ off
`keyboard.mjs` today: the lap is `t.pressedAt - t.at`, `t.at` is stamped by the
first note played on the keyboard, and `t.pressedAt` is stamped in `onTouch`,
which fires **when the press arrives**. A closing press sent from the phone
arrives one one-way trip late, so the lap is one one-way trip long. At about 21 ms
that is **1.1 per cent of a 2 s lap and 4.2 per cent of a 500 ms one**.

Compare the number that file already refuses: putting the 250 ms window inside the
lap would be *"12 per cent too long, every turn, for ever"*. **One trip is an order
of magnitude under that**, which is why this plan does not correct it.

⚠️ **AND IT MUST NOT BE CORRECTED WITH THE SENDER'S CLOCK.** `wire.mjs` carries
`at`, written by the sender's own `Date.now()`, and `plan-ws.md` §8 already says
what that is worth across devices: *"The `at` stamp is the sender's clock. Across
devices it carries their clock error."* `presence.mjs` says the same from the
other end: *"a board whose clock runs three minutes fast would read as freshly
heard from forever after it died."* **If the stretch ever matters, the correction
is half of a MEASURED round trip, subtracted, and said in the log so nobody has to
guess whether it happened.**

**The application level round trip is worth measuring and is cheap.** The relay's
own `ping` is answered by the runtime, so it measures the desktop's leg to
Cloudflare and never the phone's. `part.ping` with an `n`, answered by
`part.pong` with the same `n`, goes through the Durable Object twice and measures
both legs.

### 3.4 What would turn this into a measurement

🔴 **NO NUMBER IN THIS REPOSITORY DESCRIBES A PHONE'S LEG TO THE RELAY.** Every
figure in 3.1 was taken from a laptop on this desk. A phone on the same wifi is
INFERRED to be similar. A phone on a cellular network is a different link and
could plausibly be 50 to 150 ms, which is a guess and is marked as one. The one
adjacent measurement this project holds is `plan-m2m.md`'s **iPhone over 4G at
about 31 ms p50 and 51 ms p95**, and that is MoQ media over a different path, so
it is an encouragement rather than a number for this seam.

**What would have to be switched on:**

1. The bench measures its own round trip with `part.ping` and puts it in a readout
   cell, so the number is visible the first time anybody opens it on a phone.
2. The surface posts it to `https://pub.positron.studio/logs`, which already takes
   reports from any phone or headset and, since 2026-09-12, **persists them to
   Durable Object storage** rather than losing them inside a minute. **So the
   number comes back without anybody holding two devices and a stopwatch.**
3. Read it back with `https://pub.positron.studio/logs?format=text`, attributed by
   the `BUILD <sha>-<hhmmss>` stamp every log line opens with.

⚠️ **AND THE ANSWER MAY BE THAT IT DOES NOT MATTER.** The 250 ms window dominates
by design, so a 150 ms cellular link puts press to fill at about 550 ms, which is
slow to look at and **changes nothing about what the loop sounds like**, because
the only place the trip enters the audio is the lap stretch in 3.3. **That is the
honest shape of the risk: this feature degrades into feeling sluggish, not into
playing wrong.**

---

## 4. Failure, case by case, and what a person sees

The rule under all of these: **the surface is additive and never load-bearing.**
The desktop's keyboard, its `Loop` button and the MK-425C pad keep working
whatever the phone does. Nothing on the sound part is ever disabled because a
phone is absent, which is also what `local-remote.mjs` settled for its fader: *"a
control whose enabled state follows a socket dies under your finger."*

🔴 **AND NOBODY IS TOLD WHEN A PART LEAVES, WHICH IS WHY EVERY CASE BELOW IS
ANSWERED BY THE HEARTBEAT AND NOT BY AN EVENT.** `plan-portable-board.md` §4.4,
READ today: *"`webSocketClose()` is an empty method, so nobody is told when
somebody leaves"*, and `/stats`'s `idleMs` array *"is anonymous and sorted, so it
cannot say which socket went away."* `part.bye` on `pagehide` is best effort and
is never relied on.

**The phone loses the network mid take.** The desktop goes on recording, because
the tape is the desktop's and nothing about the phone is in the audio path. The
take does not close until somebody presses again, which they can do from the
`Loop` button or the MK-425C. On the phone: presence goes `offline` after about
4 s, the pad they pressed never changes its fill, and **the fills go to
`unknown`**. What they do: press `Loop` on the desktop.

🔴 **A GRID THAT HAS LOST THE FAR END MUST NOT PAINT `empty`, AND THIS IS THIS
PROJECT'S OWN RULE ARRIVING ONE DEVICE ALONG.** `caps.mjs` answers `unknown` and
`unknown` never blocks, because *"we did not look"* must not read as *"it is
missing"*. `presence.mjs` has four states for the same reason.
`plan-device-layouts.md` §11.2 states the sabotage that proves it: *"stop sending
lamp messages, the lamp's own state must read `unknown` rather than `off`"*. **So
the pad needs a fifth look, `unknown`**: not the `empty` look, not the `stopped`
look, and distinguishable from both at a glance, because a person who reads
`unknown` as `empty` will press a pad expecting to start a recording and will in
fact stop a loop that is still running on the other side.

**The desktop reloads.** Every take is gone: the tapes are arrays in browser
memory and nothing persists them. The room survives, because a room is a name. The
phone sees presence go `offline`, then `online` with ten `empty` slots and a new
`from`. The per-`from` sequence tracking resets by itself, because `openWire`
mints a new `from` on every connection deliberately. **The window where the phone
would be wrong is closed by the `unknown` rule above: it never shows stale fills
as current.**

**Two phones join.** Both are surfaces, both send presses, both receive the same
`loop.state`, and the relay's verbatim broadcast does it for nothing. **The one
real hazard: two people pressing the same slot inside 250 ms reads as a DOUBLE
PRESS and throws the take away.**

⚠️ **AND THE FIX IS NOT BUILT IN THE FIRST VERSION, DELIBERATELY.** It would be a
per-sender window in `numloop.mjs`, keying the pending timer by `(slot, sender)`
rather than by `slot`. That is a change to a machine with 15 passing checks, for a
case needing two people to press one key inside a quarter of a second, and it
would also break the gesture of pressing the MK-425C pad and then the phone's key
for the same slot meaning a double press. **Name it, do not build it**, and note
that the census on screen makes a second phone visible rather than mysterious.

**A press arrives out of order.** It cannot, within one sender: `wire.mjs`'s own
comment records that a WebSocket rides TCP, so one sender's messages cannot arrive
out of order and nothing goes missing without the connection dying, and
`plan-ws.md` §2 says the same. Across two senders there is no order to preserve,
because the ten machines are independent and a press has no content. **Out of
order is a non-problem on the press path and the reason is written down rather
than assumed.** On the state path it is real, and section 2.7 closes it with the
per-`from` counter.

**A phone joins while a take is already turning.** It sends `part.hello`, the
sound part answers `loop.state` at once, and the grid paints the running loops
inside one round trip. With no answer, it paints them on the next heartbeat, at
most 2 s.

🔴 **AND IT SHOWS THAT A LOOP IS RUNNING, NEVER HOW FAR THROUGH IT IS.** `/num/`
refuses this on one device: *"a steady pulse claims only running, which is exactly
what is known"*, against a bar sweeping across the key, which *"would be inventing
a position"*. On two devices the refusal is stronger, because a position needs a
shared clock and `plan-jam.md` §6 says two `performance.now()`s are *"not
comparable, at all, ever"*. **The phone pulses. It does not sweep.**

**The phone's screen locks.** UNSETTLED. Section 11.

---

## 5. Partitioning: which resources are per room, and who owns the sharing

Applying `CLAUDE.md`'s own section, which is about `workers/items` giving every
room its own Durable Object while `env.FCM_TOPIC` was shared, so **every run of
the suite sent two real notifications to every real subscriber for a day**. The
lesson: *when a resource is shared and everything around it is partitioned, ask
who owns the sharing.*

**Per room, and therefore safe:**

| resource | partitioned by | who owns it |
| --- | --- | --- |
| the relay Durable Object | `idFromName(room)`, READ off `workers/relay/src/index.js` | the relay worker |
| every socket, message, census and presence reading | the room name in the URL | the same |
| the harness's traffic | `verify.mjs` appends `room=<demo>-test-<hash>` per run | `demo/verify.mjs` |
| `numloop`'s ten slots and their takes | one browser | `createKeyboard` |

**Shared, and this is the list that matters:**

1. **The relay worker itself.** One deployment, every room, every demo. Its own
   header already states the residual risk: *"nothing here caps how many DISTINCT
   rooms one client can open"*. A remote looper adds two sockets per session
   against a cap of 128 per room, which is nothing. **Owner: `workers/relay`, and
   it has already said so.**
2. **The room name space.** Two sessions that pick the same six characters are in
   one room, and a stranger who guesses one can press the loops. **Owner: nobody.
   That is the finding**, and `plan-portable-board.md` §7.1 reached it
   independently for the board. Bounded by a billion codes and a visible census,
   and by nothing else, because the relay is tokenless on purpose.
3. **The sound part in a room.** Every surface drives one `numloop`, which is
   intended. It becomes a bug the moment TWO sound parts join, and section 2.1
   quotes the measurement of exactly that failure on two Raspberry Pis. **Owner:
   nobody today, which is why section 2.1 gives it one**: a sound part that hears
   another sound part stands down in words, an allowlist of one, default silence,
   decided by the object rather than by a name test.
4. **The device log at `pub.positron.studio/logs`.** One ring buffer for every
   device and every page. Anything this feature reports lands beside everything
   else. It carries a `BUILD` stamp per line, so a report is attributable. **Owner:
   `workers/pub`.** Not a problem, but it is shared and the rule says name it.

⚠️ **AND THE HARNESS ROOM IS PRIVATE BECAUSE IT IS RANDOM, NOT BECAUSE IT LOOKS
LIKE A TEST ROOM.** `verify.mjs`'s own comment records why: refusing rooms that
LOOK like test rooms lets the next non-real room through by default, and the
default has to be silence. **Nothing in this design tests a room name for a
prefix.**

---

## 6. A visit costs nothing

🔴 **NOTHING OPENS ON LOAD, ON EITHER PART.**

- The sound part opens no socket until somebody presses `Link a phone`.
- The surface opens no socket until somebody presses `Join`, even when it arrived
  with a room in the URL.
- No MIDI is requested on load. `/num/` and `/nola/` already put
  `requestMIDIAccess` behind a press, and `/num/`'s comment says why: a browser
  permission prompt in front of somebody who has only opened a page is the
  loudest thing a page can open. `plan-device-layouts.md` §10 says the same.
- No self-check runs for a visitor. `SELFCHECK` from `demo/shell/selfcheck.mjs`,
  gate `?selfcheck=1`, default off, no exceptions.

**The surface's one extra press is justified rather than an oversight.** Three
reasons: a link sent yesterday may point at a room that is gone; a press is the
permission and audio gesture every page here already uses; and **a tab left open
holding a socket is exactly the failure that took `studio-1` down**, where
orphaned harness Chromes filled a room at 16 of 16 and the board could not
rejoin. `plan-controller.md` §7.8 names the same thing as an open problem for the
board.

**The grid draws itself with no network at all**: ten pads in `unknown`, which is
a real state and not a lie, plus the code field and the Join button. **Nothing on
that first screen claims anything.**

**On leaving**: `pagehide` closes the socket, the way every relay page here does.
The relay's own `#reclaim` is the backstop and only runs when a room is full,
which is correct, because an idle socket in a room with space costs nothing.

---

## 7. Verification, split three ways honestly

### 7.1 No browser at all

**`numloop-test.mjs` is unchanged.** MEASURED today: 15 ok, 0 failed. Nothing in
this plan touches that machine.

**New: `demo/shell/part-test.mjs`**, grading the pure functions of the seam, which
is where every bug in this will live, exactly as `numloop.mjs`'s arithmetic was:

- a press from a `from` and `seq` already applied is refused
- a press from a NEW `from` with `seq` 0 is applied, because a reconnect restarts
  the counter and a restarted counter is not a duplicate range
- a `loop.state` whose `seq` is not greater than the last applied for that `from`
  is dropped
- the last-applied map RESETS when `from` changes
- a second sound part that hears `part.here` from a sound part stands down
- the room code is inside the relay's own regex, and six characters of the
  alphabet cannot produce `0`, `O`, `1` or `l`
- the role reads `controls` only from `role=controls`, and everything else,
  including a typo and an absent parameter, is `sound`

🔴 **AND FOUR NEGATIVE CONTROLS, OR IT IS DECORATION.** A duplicate press that IS
applied goes red. A stale state that IS applied goes red. A second sound part
that DOES take the room goes red. A `from` change that does NOT reset the map
goes red. `numloop-test.mjs` and `looper-test.mjs` each carry four of their own,
and *"the only thing separating a check from a decoration is having broken it on
purpose once."*

### 7.2 One browser

**The bench builds BOTH parts in one page and wires them to each other through a
fake transport rather than a socket.** That grades our code end to end: a press on
the grid reaches the machine, the state comes back, the fill follows, the touch
lamp clears. No network, no second device, no room.

🔴 **AND THIS IS NOT ONLY A CONVENIENCE, IT IS A REQUIREMENT, AND
`plan-instrument.md` §4 P4 SAYS WHY IN MEASURED TERMS:** *"A demo whose subject
cannot appear for a visitor is a page that reads as broken, and the suite would
assert nothing on the leg that matters, which is exactly how `moq` and `ladder`
asserted NOTHING for weeks behind a plausible excuse."* **A bench that needs two
devices is a bench nothing grades.** The one-page mode is what keeps it honest,
and the page must say in words that a second device is what the two halves are
for.

🔴 **AND IT MUST BE SABOTAGED BEFORE IT IS BELIEVED.** `positron-verify` records
four instances of one pattern: *a stand-in makes a page runnable without making it
graded*. Both `/now/` and `/flipper/` read fully green against a stand-in whose
refusals had been switched off entirely. **So: cut the fake transport, and the
grid must go to `unknown` and every assert about a fill must go red.** Whatever
stays green was never being measured. **Say which asserts are expected to fall
before running it, not after.**

⚠️ **AND ADDING THE FIRST CONTROL TO `/nola/` MOVES ITS WHOLE CHECK BLOCK.** READ
today: `/nola/` has `readout: null` and **no control row at all**, and its own
comment records why, because `demo/verify.mjs` drives a page by clicking
`.pos-controls button` and deleting the one handler would have taken every check
out of the run while the suite stayed green. A `Link a phone` button is that
page's first control, so **the harness will press it on every run**, which opens a
relay socket in the harness's own private room and declares `by: 'tool'`
automatically. That is safe, and it must be verified rather than assumed: **diff
the per-page assert count either side of the change.**

### 7.3 Genuinely two devices, and therefore not in `verify.mjs`

**These cannot be checked by any harness here, and inventing one that pretends to
would be worse than saying so.**

- **The phone's leg to the relay.** The number nobody has. Section 3.4.
- **Whether a press on a phone screen and a press on the MK-425C inside 250 ms
  read as one double press.** Two input paths, two devices, one window.
- **Whether the touch lamp still reads as honest at 150 ms rather than at 40.**
  That is a judgement about feel and only a pair of hands can make it.
- **What the phone does when its screen locks.** Section 11.
- **Whether two people on two phones ever collide on one slot.**

✅ **THE INSTRUMENT THAT CAN REACH THEM IS THE DEVICE LOG.** The surface posts what
it measured to `https://pub.positron.studio/logs` and it is read back with
`?format=text`. That is not a harness and it is not automatic, and it is the only
honest way these get numbers.

⚠️ **AND VERIFY ECONOMICALLY.** `node demo/check-html.mjs demo/<slug>/index.html`
parses the page with no browser at all and is the first answer. `node
demo/verify.mjs <slug>` runs only the page that was touched. A full suite is
dozens of Chromes and is not how you find out whether one page still works.

---

## 8. The interface, and what the kit already has

Nothing new is drawn. Every control below exists.

| what | component | note |
| --- | --- | --- |
| the ten loop keys | `createPadGrid({ cols: 3, rows: 4 })` from `pad.mjs` | `/num/`'s call exactly, with the two blanks disabled |
| the pad state | `pad.button.dataset.st`, `pad.button.dataset.touch` | `/num/`'s two channels, and `positron-ui` says measure the BUTTON, never the wrapper |
| is the far end there | `createPresence` / `createPresenceButton` | four states, and `unknown` never blocks |
| the room code | `createField` from `field.mjs` | its header already names this case, and autocorrect is off |
| Join and Link | `d.controls` | so `verify.mjs` can press them |
| the log | `d.log` | a state change goes in the log when it changes, never in a sentence that rewrites itself |

🔴 **A FIFTH PAD LOOK IS THE ONE GENUINELY NEW PIECE OF CSS**, and it is
`unknown`: the far end has not answered, so this page does not know what this slot
is doing. It must be distinguishable from `empty` and from `stopped` at a glance.
Section 4 has the reason and it is not cosmetic.

**The readout on the surface: four cells, and none of them is a constant.** `live`
(how many slots are running), `here` (how many parts are in the room), `trip` (ms,
the measured application-level round trip), `worst` (ms). All four move, the count
is even so `mount()` does not throw, and none of them prints `0` before it has
happened.

⚠️ **AND A VALUE CELL HOLDS ABOUT EIGHT CHARACTERS AT 390 px**, MEASURED and
recorded on `/instrument/`, where `not asked` at nine characters still clipped.
The sentence goes in the log, which wraps.

**No middots and no em dashes anywhere a reader looks**, including pad titles, log
lines and presence words. A row of facts is cells, not one string with glue in it.

**The description is ONE sentence**, in `what` and in `manifest.mjs`'s `one`, and
they are the same string. No colon, no semicolon, no dash buying a second clause,
no history and no justification for a design decision.

---

## 9. What this plan refuses, and why

1. **Audio over the seam.** A control surface does not need any. `/instrument/`
   already carries audio over WHEP and `/moq/` over MoQ, both measured, and
   neither is needed here.
2. **A shared clock.** Section 1.3.
3. **State in a Durable Object.** Section 2.5. It would be more durable than the
   thing it describes.
4. **A copy of the state machine on the phone.** Section 2.4.
5. **Replacing a sitting sound part, the way `workers/instrument` replaces a
   host.** Section 2.1. The first one holds takes.
6. **Branching on what kind of device this is.** Capability, never user agent.
7. **A position inside a lap, drawn on the phone.** Section 4.
8. **Changing `numloop.mjs` for the two-phone collision.** Named, not built.
9. **Nine of ten slots.** Section 2.3.
10. **A default room name.** Section 2.2.
11. **A socket on load.** Section 6.
12. **A per-message acknowledgement.** `plan-controller.md` §4.2: it doubles the
    traffic and is the wrong shape. The heartbeat is the repair.

---

## 10. Instances two and three, ranked

Ranked by value divided by cost, not by cost.

### Instance two: the knobs in your hand, the sound on the desk

**`/shape/` edits a Novation Circuit's sound while it is playing, and `/knobs/`
turns a synthesiser's knobs in another building.** Today both put the sliders on
the laptop. Moving them to a phone means standing at the instrument with the
controls rather than sitting at a screen across the room, which is a different
activity rather than a convenience.

**What the seam carries**: a continuous value instead of a momentary press.
RECORDED in `workers/relay`'s own comment, one knob turn is about 60 messages a
second, against a cap of 1000. **Bandwidth is not the cost.**

**What it costs, and why it is second rather than first**: a value that can be
moved from two places is the "two copies disagree" problem the looper avoids by
having no state on the surface. `plan-device-layouts.md` §9.3 already states the
shape without solving it: *"A control a person drags on a Model 12 layout creates
a divergence nothing can close. Three honest options and the plan does not pick
one. What is NOT an option is letting them move silently."* And
`local-remote.mjs` records the other half: a control whose state follows a socket
dies under your finger. **So instance two is `part.mjs` plus one genuinely new
rule, and that rule has been open in this repository for two plans already.**

⚠️ **AND IT HAS A PRECEDENT FOR THE REPAIR.** `plan-controller.md` §4.2's
`ctl.meter` carries the full controller state every 500 ms, *"the full statement
in the other direction: what the board actually holds. A page that reconnects
re-syncs from it without asking."* The same shape works here, and the open
question is only what a fader does when a value arrives under a finger.

### Instance three: the phone as the score and the roll

**`/nola/` draws a chord line and a roll, and the person playing is looking at a
laptop behind a MIDI keyboard.** A phone on a music stand showing the chords is a
second screen with no controls at all.

**What the seam carries**: the chord list once, which is a document, plus a
position. **One way only**, so there is no de-duplication, no authority argument
and no collision. **Cheaper to build than instance two.**

**Why it ranks third anyway**: the value is lower. A second screen is convenient;
a second pair of hands is a new capability. And the position is the expensive half
of the table in section 1.2, because a phone would have to interpolate between
updates or the line would jump, which is the one thing `positron-ui` forbids
outright for anything that redraws.

### What all three share

**One module.** If `part.mjs` is right, instance two costs one rule and instance
three costs almost nothing. If it is wrong, all three pay. **That is the argument
for building the bench first and for grading the seam with no browser**: the seam
is the part that gets reused, and it is the part nothing on screen can show you is
wrong.

---

## 11. What this plan could not settle

Stated in these words rather than answered with the confident-sounding option.

1. **What a phone's leg to the relay costs.** No measurement exists. Section 3.4
   names what would take one.
2. **What happens when the phone locks its screen.** iOS suspends timers in a
   backgrounded tab and may close a WebSocket without the page being told in a way
   it can act on. `wire.mjs` reconnects, but whether the reconnect happens on
   unlock, how long it takes, and whether the presence badge tells the truth
   across the gap are all unknown here. **This is the most likely place a person
   playing will meet a defect**, because putting a phone down is a normal thing to
   do. ⚠️ `plan-m2m.md` carries the adjacent warning worth heeding here: *"retry
   backoff MUST be jittered, deterministic backoff resynchronized failing legs
   into lockstep retry storms"*, and `openWire`'s backoff is not jittered today.
3. **Whether the lap stretch of one one-way trip is audible.** Computed at 1.1 to
   4.2 per cent depending on lap length. `keyboard.mjs` refuses 12 per cent. **No
   threshold between them has been established by anybody playing anything.**
4. **Whether the 250 ms window feels different when the press was remote.** The
   cost is nearly the same number; whether it FEELS the same is a judgement about
   a delay you did not cause.
5. **Which of the two relay measurements describes the link a phone will use.**
   They disagree by six times on the hop, both were taken honestly on different
   days from different networks, and neither was taken from a phone. Section 3.1.
6. **Whether `part.mjs` is one seam or two.** The census and the role rule might
   belong apart from the de-duplication and the ordering. This will be obvious
   after instance two and is not obvious now.
7. **Whether two phones ever happens.** The whole two-phone section is designed
   against a case nobody has met.
8. **The slug.** `/pair/` is a proposal.

---

## 12. Build order

1. **`demo/shell/part.mjs` and `demo/shell/part-test.mjs`, together**, with the
   four negative controls. **No page yet.** Everything in section 7.1 is gradable
   with no browser and is where the bugs are.
2. **The bench page**, both parts in one tab over a fake transport, sabotaged once
   before it is believed. `node demo/check-html.mjs` first, then `node
   demo/verify.mjs <slug>`.
3. **The bench over the real relay**, two tabs on one machine, which is the first
   time a room, a code and a reconnect are real.
4. **A phone.** The first genuine measurement, reported to
   `https://pub.positron.studio/logs`, read back with `?format=text`, attributed
   by the `BUILD` stamp. **Section 3.4 stops being inference here and nowhere
   earlier.**
5. **`/nola/` gains the three lines**, and the per-page assert count is diffed
   either side of the change, because it is that page's first control.
6. **Only then, instance two.**

⚠️ **AND STEPS 1 TO 3 COST NOBODY ELSE ANYTHING.** No external source, no
broadcaster, no station, no archive. The only server involved is
`ws.positron.studio`, which is ours, and the relay's own caps are two orders of
magnitude above what this uses.
