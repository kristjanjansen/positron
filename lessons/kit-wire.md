# Kit lessons: wire.mjs, wire-test.mjs

The long comments cut from `demo/shell/wire.mjs` and `demo/shell/wire-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-wire.md#<anchor>`.

<a id="header"></a>

## wire.mjs, file header, the envelope

demo/shell/wire.mjs — the message shape every positron page sends, written
down once. plan-ws §2.

  { "type": "<verb>", "from": "<connection id>", "sent": <epoch ms>,
    "seq": <per-connection counter>, ... }

Four keys are the envelope; ANYTHING ELSE IS THE SENDER'S OWN BUSINESS and is
carried verbatim, which is the rule plan-score already settled for p-fields.

`sent`, NOT `at`, SINCE 2026-10-04. One time vocabulary across the project,
decided by the owner that day: `at` always means WHEN THE THING HAPPENS (a
timeline row's position, an event's moment on the peer clock, see
`timebase.mjs`), and `when` is the uncertainty bracket around an `at`. The
envelope's stamp is none of those. It is the sender's own Date.now() at the
moment of sending, on no agreed clock, MEASURED up to 159 ms off between two
machines. So it is called what it is, and a payload may now carry `at`.

`type`, not `t`, which five callers said until they were swept on
2026-09-10: `t` means TIME everywhere else in this project
(`reduce(events ≤ t)`, `t0`, the strip's row `t`), so a key meaning *verb*
would sit one letter from a key meaning *when* with nothing to catch a
misread. Three bytes a message; 180 B/s at the relay's own 60 msg/s
ceiling, against a 512 KiB/s budget.

`from` is minted PER SOCKET, not per person, because `seq` counts a
connection. Two tabs under one persisted user id interleave two counters and
manufacture gaps that never happened. A user id is app data and rides along
beside `from` — they are not the same fact and the envelope should not
pretend they are.

What `seq` is for, since the first version of this comment was wrong: a
WebSocket rides TCP, so one sender's messages CANNOT arrive out of order and
nothing goes missing without the connection dying. It sees the two ways this
relay loses a message anyway — the caps biting (256 KiB / 512 KiB/s /
60 msg/s, dropped silently and counted only in the relay's own /stats) and a
reconnect gapping. A check written to catch reordering would pass forever.

<a id="relay-override"></a>

## wire.mjs, `relayOverride()`, `?relay=`

🔴 `?relay=` POINTS A PAGE AT A STAND-IN RELAY, THE WAY `?base=` POINTS THE
OTHER THREE AT THEIRS. plans/plan-routing-migration.md §3.8: every page that
plays the Raspberry Pi talked to the real one in another building, so nothing
a page sends the board could be graded without spending the board. With
`?relay=ws://127.0.0.1:<port>` every `openWire` and every page that builds a
URL off `RELAY_BASE` joins `demo/fake-relay.mjs` instead, where
`demo/fake-board.mjs` answers in the board's place.

⚠️ LOOPBACK ONLY, AND ANYTHING ELSE IS IGNORED RATHER THAN OBEYED. A query
parameter is something a link can carry, so an unrestricted one would let a
link a stranger posted point a visitor's page, and every note it sends, at a
server that is nobody's here. A stand-in lives on this machine by definition,
so `ws://` or `wss://` on 127.0.0.1, localhost or [::1] is the whole of what
this needs. A refused value says so once in the console and changes nothing.
⚠️ AND IT CANNOT WORK FROM THE DEPLOY: a secure public origin may not reach a
loopback address (positron-verify, measured on `fake-station.mjs`), so this
is for a page served locally, which is how `demo/verify.mjs` runs it.

<a id="limits"></a>

## wire.mjs, `LIMITS`

🔴 EVERY NUMBER HERE WAS WRONG, UNDER A COMMENT SAYING IT COULD NOT BE. It
claimed to be read from the worker rather than typed twice, and it was typed
twice: 4x low on bytes, 8x on sockets, 16x on bandwidth and 16.7x on the
message rate. Corrected 2026-09-17 against the relay's OWN declaration at
`GET /room/<name>/stats`, which is the authority and answers
`{"maxBytes":1024000,"maxSockets":128,"bytesPerSec":8388608,"msgPerSec":1000}`.

⚠️ A CONSTANT THAT CLAIMS TO BE DERIVED AND IS NOT is worse than one that
admits it is a copy, because the claim stops anybody checking. The honest
version is this: it is a copy, the relay reports the truth at `/stats`, and
anything that MATTERS should ask rather than read this.
⚠️ AND THE DIRECTION OF THE ERROR MATTERS. Every value was too SMALL, so a
page reading these refuses work the relay would have accepted, and a capacity
story built on them understates the room by more than an order of magnitude.

<a id="envelope"></a>

## wire.mjs, `ENVELOPE`, the full shape and the reserved keys

The full shape, always. elektron v3 fills its keys with empty strings and
says why — "some clients just check for the value in the message, not
whether the key exists" — which is a scar, and the cheap way not to re-earn
it is to send every envelope key every time.
⚠️ `from`, `sent` and `seq` BELONG TO THE ENVELOPE and are written AFTER the
message is spread, so a payload field with one of those names is silently
replaced. It has happened for real, when the stamp was still called `at`:
`source.load` carried the excerpt's start
offset as `at`, every send overwrote it with `Date.now()`, and the box asked
ffmpeg to seek to second 1,789,103,743,118 of a forty-five minute broadcast.
ffmpeg returned sixty seconds of real audio from wherever it decided that
was, so the feature made sound, the suite stayed green, and the only control
it had did nothing.

Throwing is the point. This is a programming error with no correct silent
behaviour, it fires on the first send rather than in the field, and the
alternative — the value quietly becoming a timestamp — is the failure that
cost the afternoon. Name the field something else: `sentSec`, `fromId`, `n`.
(`at` is no longer one of them: since 2026-10-04 it is the payload's own
event time. Pages that renamed theirs to `atSec` to dodge the old envelope
keep the name; nothing is gained by churning them.)

<a id="kinds"></a>

## wire.mjs, `KINDS`, who is sending

🔴 WHO IS SENDING THIS, IN THE ONLY SENSE THIS RELAY CAN ANSWER. Asked
2026-09-17, about a badge that says somebody else is driving the instrument:
*"what is 'you' me as user in single widow or the agent messing with
verificiations etc. can we mark agent-messing specially so we can
distinguish"*.

IDENTITY IS IMPOSSIBLE HERE and pretending otherwise would be the worse
answer. `from` is minted per SOCKET and is a random id, so your other tab and
a stranger are indistinguishable by it, and nothing on this relay
authenticates anybody. What IS possible is that every client we write says
what KIND of thing it is, because we write all of them.

`page` is a person looking at something. `tool` is a harness, a probe or a
script, and it is the one worth telling apart: a run of `demo/verify.mjs`
drives a real page and would otherwise be indistinguishable from a person
sitting down at it. A page under `?selfcheck=1` therefore declares `tool`,
which is the exact case that prompted the question.
⚠️ IT IS A DECLARATION, NOT A CREDENTIAL. Anything may claim anything, and
that is fine: this exists so a page can say something useful about traffic it
already receives, not to keep anybody out.

<a id="normalise"></a>

## wire.mjs, `normalise()`

What arrived, told apart rather than guessed at. Binary is a first-class
answer here: the relay carries `ArrayBuffer` unchanged, so a frame that is
not JSON is not necessarily broken.

🔴 AND AN OLD MESSAGE IS NORMALISED HERE, BEFORE ANY READER SEES IT. Until
2026-10-04 the envelope's send stamp was called `at`, and old senders keep
existing for a while: the Pi board until it is redeployed, the Pico until it
is reflashed, a tab left open, rows already in `workers/store`. A new reader
reads `at` as WHEN THE EVENT HAPPENS, so an old message's `at` read that way
would be a send time on nobody's clock, up to 159 ms off, scheduled as if
somebody had agreed it. So: a message with no `sent` and a numeric `at` is
the OLD shape, and its `at` becomes `sent` and is deleted. A message that has
`sent` is the new shape and its `at`, if any, is the event time, kept.
⚠️ The one thing this cannot tell apart: a NEW-shape message hand-built
without `sent` that carries an event `at`. Every sender that goes through
`format()` writes `sent`, so that is a sender bypassing this module.

<a id="open-wire"></a>

## wire.mjs, `openWire()`

One room, one socket, and the counters that make a loss visible.

Reconnect is included because every positron page lacks it — `cues` logs
"relay closed" and stops, so on a phone that changes network our pages
quietly stop working. elektron carried `reconnecting-websocket` in both v1
and v3; this is that, minus the dependency, plus the thing it did not have:
a NEW `from` on every connection, so the restarted counter cannot be read as
a duplicate range.

<a id="open-wire-by"></a>

## wire.mjs, `openWire()`, `by`

What kind of client this is. See `KINDS`. A browser page leaves it alone
and gets `page`; a harness, a probe or a node script passes `tool`.
⚠️ A PAGE BEING DRIVEN BY THE HARNESS IS A TOOL, and it knows: every demo
the suite opens carries `?selfcheck=1`, which is read here rather than left
to each page to remember.

<a id="diagnose"></a>

## wire.mjs, `diagnose()`

Why the upgrade was refused, asked of the only thing that can answer.

Best-effort and never awaited by the reconnect: the point is to put a
reason in front of a person, not to gate a retry on a second request that
may fail the same way. `refusal` is null until something is known.

<a id="close-refusal"></a>

## wire.mjs, close before open

⚠️ A CLOSE THAT NEVER OPENED IS A REFUSAL, AND THE ROOM BEING FULL IS
THE LIKELY ONE. The relay caps a room at MAX_SOCKETS and answers the
seventeenth upgrade `503 room full (16)` rather than accepting and
dropping — deliberately, because "a client that is told no can retry".
But this loop could not hear it: **a browser cannot read the HTTP
status of a failed WebSocket upgrade**, by design, the same way it
cannot read a response's `Date` header (LESSONS #38). So a full room
and a dead relay produced the identical `error` then `close`, and the
seventeenth headset in a room would back off to 5 s and retry forever
with nothing anywhere saying why.

`/stats` is an ordinary CORS-clear GET on the same host (verified:
`access-control-allow-origin: *`), and it reports `sockets` against
`limits.maxSockets`. So ASK, rather than infer from a silence.

<a id="test-header"></a>

## wire-test.mjs, file header

demo/shell/wire-test.mjs: the envelope's names, and the migration between them, with no socket.

  node demo/shell/wire-test.mjs

`format()` and `parse()` are pure, so the shape every positron page sends is
gradable here. What is graded is the decision of 2026-10-04: `at` ALWAYS
means when the thing happens, so the envelope's send stamp is `sent`, and a
payload may carry `at` again.

THE TRAP THIS FILE EXISTS FOR. Old senders keep existing for a while: the Pi
board until it is redeployed, the Pico until it is reflashed, a tab left
open, rows already in `workers/store`. Each of them writes the send stamp as
`at`. A new reader that took that `at` as an event time would schedule a
send stamp on nobody's clock, MEASURED up to 159 ms off between machines, as
if somebody had agreed it. `parse()` renames it to `sent` first.

NINE OF THE 18 ARE NEGATIVE CONTROLS, marked `NEGATIVE CONTROL` and counted
at the end. They are written so the bug they name fails them.

SIX SABOTAGES, MEASURED 2026-10-04, each on a copy of `wire.mjs` in a scratch
directory with this file beside it, 16/16 before every one:

  W1  `format()` writing the stamp as `at` again            5 red
  W2  `sent` left out of the envelope list, so no throw     1 red
  W3  `parse()` not normalising at all                      3 red
  W4  normalising sets `sent` and keeps the old `at`        2 red
  W5  normalising on truthiness, so `at: 0` is missed       2 red
  W6  normalising whenever `at` is there, `sent` or not     2 red

`openWire()`'s reconnect and close are graded against a fake WebSocket in
this file. Its traffic against a real room is graded by the pages.
