# Kit lessons: presence.mjs, presence-test.mjs

The long comments cut from `demo/shell/presence.mjs` and `demo/shell/presence-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-presence.md#<anchor>`.

<a id="header"></a>

## presence.mjs, file header

demo/shell/presence.mjs — is the thing on the other end there?

Four pages ask this question and four pages answer it differently. `/knobs/`
waits six seconds and writes a log line, `/grains/` waits for a `board.hello`
and enables its buttons, `/keys/` watches for the same message and draws an
instrument row, `/able/` waits on an agent on a Mac that may simply be off.
None of them can SHOW the answer without reading the log, and none of them
distinguishes the two greys: a thing that has gone quiet, and a thing nobody
has asked yet.

🔴 FOUR STATES, NOT THREE, AND THE FOURTH IS THE HONEST ONE. CLAUDE.md is
explicit that "we did not look" must not read as "it is missing", which is
why `caps.mjs` answers `unknown` and why `unknown` never blocks anything.
A badge that opens on `offline` is a page asserting a measurement it has not
taken, about hardware in another building, in the two seconds before the
first heartbeat lands. It is wrong exactly when somebody is watching.

  unknown   nothing has answered and not enough time has passed to say
  coming    something is on its way up, and this is the state that moves
  online    it spoke inside the time it promised to speak in
  offline   it was there and has gone quiet, or it was listened for and never came

🔴 THE PICTURE IS HERE; THE POLICY IS A PURE FUNCTION BESIDE IT, AND THE
NUMBER BELONGS TO WHOEVER KNOWS THE HEARTBEAT. `presenceOf` takes a last-seen
time and an expected interval and returns one of those four words. It holds
no clock, no socket and no element, so the whole of the rule is gradable by
`node demo/shell/presence-test.mjs` rather than by watching a board in
another building and wondering. The board beats every 5 s (`rig/board/board.mjs`
sends `board.alive` on a 5000 ms interval), so a page passes `everyMs: 5000`
and does not invent a rule of its own.

⚠️ `lastSeenAt` IS WHEN YOU HEARD IT, NOT THE STAMP INSIDE THE MESSAGE. Every
envelope on this project's relay carries `at`, written by the SENDER with its
own `Date.now()`, and a board whose clock runs three minutes fast would read
as freshly heard from forever after it died. Call `seen()` when the message
arrives. A `lastSeenAt` later than `now` is answered `unknown` rather than
`online`, because a measurement from the future is a mis-measurement and this
file's whole subject is not dressing one of those up as a fact.

<a id="says-checking"></a>

## presence.mjs, SAYS.checking

🔴 `checking` IS NOT `coming online`, AND THE DIFFERENCE IS WHAT WE KNOW.
Instructed 2026-09-16: *"its not 'coming online', it is likely online we
just check it"*. A page that has just opened is asking a question about a
thing that was probably there all along; a page showing `coming` is saying
the thing is on its way up, which is a claim nobody has made yet.

So the badge reads on two axes. COLOUR says what is known: green for a
thing that spoke, grey for a thing that has not. MOTION says something is
happening: a question is out, or an instrument is starting. Grey and moving
is us; green and moving is it.
⚠️ IT EXISTS BECAUSE THE STILL ALTERNATIVE LIES BY OMISSION. Asking takes
300 ms when the board answers and about six seconds when it does not, and
six seconds of a motionless dot reads as a page that has stopped.

<a id="says-unknown"></a>

## presence.mjs, SAYS.unknown

⚠️ `unknown`, NOT `no word yet`. Instructed 2026-09-16 with a screenshot:
*"last is UNKNOWN"*. The old wording described the BADGE's situation rather
than the thing's, which is a label talking about itself.

<a id="wired"></a>

## presence.mjs, WIRED

🔴 WHAT AN INSTRUMENT ON A CABLE SAYS, WHICH IS NOT WHAT A THING ON A RELAY
SAYS. Asked 2026-09-21: *"synts: not connected / connected"*, and again the
same day as *"Use connected connecting not connected on all hw demos when
applicable"*.

`online` and `offline` are NETWORK words. They suit a Raspberry Pi answering
over a relay from another building, which is what this badge was built for.
A synth on a USB cable on this desk is CONNECTED or it is not, and a page
saying a plugged-in Circuit is `online` is describing the wrong kind of
presence.

🔴 **IT IS ONE MAP HERE, NOT THREE WORDS TYPED INTO FIVE PAGES.** That is the
whole reason it is an export rather than an object literal per caller: five
pages writing their own `says` is five vocabularies that agree today, and the
hand-rolled control rule arriving by a different road. A page passes
`says: WIRED` and nothing else.

🔴 **THREE WORDS FOR FIVE STATES, AND THE TWO COLLISIONS ARE DELIBERATE.**
 - `checking` and `coming` both read **connecting**. A cable has no
   difference between *we are asking* and *it is starting up*: there is
   nothing to start. What both mean to somebody holding a plug is that the
   answer has not arrived yet.
 - `unknown` and `offline` both read **not connected**. Asked for directly
   (*"unknown: not connected"*). The two states still MEAN different things
   and `presenceOf` still tells them apart: `unknown` is *we have not looked
   yet* and `offline` is *we looked and nothing answered*.
⚠️ **SO THE DOT IS NOW THE ONLY THING SEPARATING THEM AND IT MUST STAY
HOLLOW.** `unknown` is drawn as a hollow ring precisely because nothing has
been asked, and that ring is carrying the whole distinction once both states
say the same words. If that ever reads as a defect, the repair is different
words for `offline`, never a rewritten `unknown`.

⚠️ **AND THE BADGE GETS WIDER, WHICH IS ARITHMETIC RATHER THAN A SURPRISE.**
The reserve is measured off the longest phrase an instance can say, so
`not connected` (13) replacing `checking` (8) as the longest widens every
state of every badge that takes this map. `/kit/`'s specimens use `SAYS` and
do not move.

⚠️ **WHICH PAGES, AND IT IS NOT ALL OF THEM.** `/circuit/`, `/twelve/`,
`/shape/`, `/bay/` and `/evo/` are USB on this desk and take these words.
`/knobs/` reaches a board over a relay through `board.mjs`, and `/stage/`
asks whether a show is on air, so both keep their own. That split is why
this is a named map a caller opts into rather than an edit to `SAYS`.

<a id="stream"></a>

## presence.mjs, STREAM

🔴 WHAT A STREAM SAYS, WHICH IS NEITHER A NETWORK WORD NOR A CABLE WORD.
Asked 2026-09-29 against `/llhls/`: *"rm primary button with status
togglebutton: stream off | starting | on. make a global component for this if
needed"*, and in the same sitting for `/webrtc/` as *"same treatment"*.

🔴 **THE COMPONENT WAS NOT WHAT WAS MISSING. THE VOCABULARY WAS.**
`createPresenceButton` is already a primary-row control whose face is a live
badge: it reserves the width of the longest phrase it can ever say, fades the
word through on a change rather than resizing, keeps its announcement for a
screen reader, and lives in `.pos-controls` where `demo/verify.mjs` presses.
Four pages drive one with `WIRED` today. What those two streaming pages
needed was three words, and three words typed into two pages is the
five-vocabularies argument this file already makes about `WIRED` one entry
up: they agree on the day they are written and nothing keeps them agreeing.

🔴 **`stream off`, `starting`, `on`, WHICH ARE THE ASK'S OWN WORDS.** They
map onto the states with nothing left over, because the thing being described
really does have exactly these three readings: nothing is publishing, a
container and its encoder are waking, frames are arriving.
⚠️ **AND `checking` SAYS `starting` TOO, WHICH IS `/stage/`'s DECISION
REACHED INDEPENDENTLY.** That page settled the same question on 2026-09-25
(*"what is started and what is checking. in ui it should be same for user"*):
the two states are different facts and the badge keeps them apart in colour
and motion, but to somebody who has just pressed one button they are one
moment with one name.
⚠️ **`unknown` AND `offline` BOTH READ `stream off`, THE SAME COLLISION
`WIRED` MAKES AND FOR A BETTER REASON HERE.** Before anybody presses, nothing
IS publishing, and both pages say so in their own log line. The hollow ring
still separates the two states for anybody who can see it, and `STREAM_CAN`
leaves `unknown` out anyway, so a live badge opens on `offline` and the
reserve is measured on `stream off` at ten characters.

<a id="stream-says"></a>

## presence.mjs, streamSays

🔴 AND EACH STREAMING PAGE NAMES ITS OWN TRANSPORT. Asked 2026-09-30:
*"webrtc demo: button labels: WEBRTC OFF / WEBRTC ON. analogue titles form
moq / llhls"*. The `CAMERA` shape below, with the transport's name in it, so
`/webrtc/`, `/llhls/` and `/moq/` read differently while sharing one
vocabulary. The badge uppercases by CSS, so `LL-HLS` is written as it is
said and `MoQ` reads MOQ.

<a id="camera"></a>

## presence.mjs, CAMERA

🔴 WHAT A CAMERA SAYS, THE SAME SHAPE AS `STREAM`. Asked 2026-09-30 against
`/cam/`: *"stat / stop camera: convert to oline status button: CAMERA ON |
CAMERA OFF"*. The badge uppercases by CSS, so the words are written as they
are said. `starting` covers the camera permission and the legs coming up,
which is the one stretch where a press means stop.

<a id="no-default-every"></a>

## presence.mjs, presenceOf, no default for everyMs

🔴 NO DEFAULT FOR `everyMs`. A default of one second would call a board
with a five-second heartbeat offline between every beat, which is a badge
that flickers grey on working hardware and sends somebody to look at the
hardware. The interval is a fact about the far end and only the page knows
it, so a page that has not said what it is has a bug and hears about it on
the first call rather than in the field.

<a id="coming"></a>

## presence.mjs, presenceOf, coming

⚠️ COMING LOSES TO `online` AND BEATS BOTH GREYS. A synth coming up on the
board takes ten to forty seconds, and for all of it the honest answer is
that something is happening. It must not read as offline, which would make
every press of Play look like a dead button for half a minute.
⚠️ AND IT IS ALLOWED AN EXPIRY, because a thing that has been "coming
online" for ten minutes is not coming online. `comingMs: null` means the
page will clear it itself, which is right where the page gets a reply that
tells it the attempt failed.

<a id="wire-presence"></a>

## presence.mjs, wirePresence

The same four words, read off a WebSocket rather than off a heartbeat.

`openWire` in `wire.mjs` already knows three of the things a page needs and
every page re-derives them: `state()` is the raw `readyState`, `stats()`
carries `refusal` (why the last upgrade was refused, when the relay could be
asked) and `reconnects`. This turns those into a state and a sentence, so a
page gets a socket badge in one line instead of four handlers.

⚠️ A SOCKET AND THE THING AT THE FAR END ARE TWO SUBJECTS AND GET TWO BADGES.
The relay being reachable says nothing about whether the board is plugged in,
and `/knobs/` proves it: the socket opens in 200 ms and the board may be off.
Use this for the relay, `presenceOf` for whoever is meant to be in the room.

⚠️ A CLOSED SOCKET IS `offline` EVEN WHEN A RETRY IS SCHEDULED, on purpose.
Right now nothing can be reached, which is what a reader wants to know;
`openWire` backs off at 300 ms, so the badge turns to `coming` on its own
within a third of a second of the retry firing.

<a id="create-presence"></a>

## presence.mjs, createPresence

A badge, or a dot inside something else.

🔴 ONE COMPONENT, TWO MODES, AND THE ONLY DIFFERENCE IS WHAT IS VISIBLE.
`mode: 'badge'` shows a dot, an optional fixed name and the word.
`mode: 'dot'` shows the dot alone and CLIPS the words rather than removing
them, so the accessible name is still "the board coming online" and the live
region still announces a change. A dot whose meaning exists only in colour is
a dot a screen reader cannot read at all, and `display: none` is exactly how
that happens by accident.

🔴 NOTHING HERE CHANGES SIZE WHILE IT REDRAWS. Two separate guards, because
there are two ways this could move: the animated part is the dot's FILL and
the only property that animates is `opacity`, which cannot affect layout; and
the word sits in a box whose `min-width` is reserved at build time from the
longest thing this instance can ever say, measured in `ch` of the mono face
it is set in. So the badge is the same width in all four states and the same
width at every moment of the animation. Graded in `/kit/`, by measuring four
badges rather than by pressing one through four states.

⚠️ NO LETTER-SPACING ON THE WORD. `ch` is the advance of `0`, and letter
spacing adds to every advance, so a tracked-out word would overflow a reserve
computed in `ch` by exactly one space per character.
⚠️ THE EXAMPLE THAT USED TO STAND HERE IS GONE, WHICH IS WHY THE LINE MOVED.
It named `.tbar-live`, the transport bar's `LIVE` chip, as a tracked word
that got away with it because its word never changed. That chip is one of
these badges now (`ON_AIR` in `transport-bar.mjs`), so its word DOES change
and there is no tracking left on it anywhere. The rule is untouched; only
the thing it pointed at has stopped existing.

<a id="can"></a>

## presence.mjs, createPresence, can

🔴 WHICH STATES THIS BADGE CAN EVER SHOW, because the reserve below is the
longest word among them and a badge that will only ever say one word should
not hold room for three. A live badge leaves this alone and keeps its
no-twitch guarantee; a fixed specimen passes its own single state and sits
at its own width, which is what makes a ROW of them evenly spaced.
REPORTED 2026-09-16 with a screenshot of four specimens: *"same spacing
between"*, and the uneven look was each of them reserving room for
`coming online`.

<a id="busy-words"></a>

## presence.mjs, createPresence, busyWords

🔴 A SECOND FACT ON THE SAME BADGE, AND IT REFINES `online` RATHER THAN
REPLACING IT. Asked 2026-09-17: *"one board per person, private room. - so
do we need occupied status on online badge?"*, and then *"can we mark
agent-messing specially so we can distinguish"*.

The answer to the first is yes, and not for the reason it looks like. One
board per person does not make this state unreachable, because the room is
not the unit of contention: the INSTRUMENT is, and your own second tab is
another client. MEASURED 2026-09-17 on this relay: a parked tab restating
`CC 7 = 22` every 500 ms held a shared synth a fortieth of its level, and
nothing anywhere said so, which is why it read as a hardware fault.

⚠️ IT IS A REFINEMENT OF `online`, NOT A SIXTH STATE. The presence word
answers "is it answering", which outranks everything: a board that has gone
offline is offline whether or not somebody was driving it a second ago.
⚠️ AND THE RESERVE COVERS THESE TOO, so the badge cannot twitch when the
word changes. That is the whole reason this is done with words rather than
with a mark appearing beside the badge.

<a id="busy-at-build"></a>

## presence.mjs, createPresence, busy

Which kind is driving AT BUILD, for a fixed specimen. A live badge leaves
this alone and calls `busy()`.
⚠️ IT EXISTS BECAUSE `busy()` FADES, and a fade is 90 ms during which the
element still holds the old word. `/kit/`'s three specimens were built and
then switched, and the check that reads them ran inside that trough and
reported all three saying `online`. The page was right and the check was
early. A specimen that is born in its state has nothing to transition from.

<a id="dot-leads"></a>

## presence.mjs, createPresence, the dot

🔴 THE DOT LEADS, AND IT WENT TO THE RIGHT FOR ONE BUILD. Asked for
(*"dot should not appear before text"*), tried, photographed, and asked
back (*"put dot back to left"*). The reason it failed is the reserve: the
widest phrase this badge can say is held on the WORD, so a dot after it
parks at the end of that reserved width rather than after the text. On
anything shorter than the longest state it floated off on its own with a
gap in between, which reads as a stray mark rather than as part of a label.
⚠️ SO THE TWO POSITIONS ARE NOT EQUIVALENT: leading is the one that can be
fixed to the text, because the text grows to the right of it.

<a id="one-phrase"></a>

## presence.mjs, createPresence, name and state

🔴 THE NAME AND THE STATE ARE ONE STRING. Instructed 2026-09-16:
*"rasperry pi online: all same string, shuould animat in same time (no
'fixed' device name)"*.

They were two elements, and the name was held still while only the state
faded. That reads as half a label twitching: `RASPBERRY PI` sitting fixed
while `ONLINE` dissolves under it is two things where a reader sees one
phrase. One element, one fade, one colour.
⚠️ THE RESERVE NOW COVERS THE WHOLE PHRASE, name included, or the badge
would twitch on exactly the pages that name their subject.
⚠️ AND NO LETTER-SPACING ON IT. The tracking used to live on the name,
where width did not matter; inside the reserve it would overflow by a space
per character, which is why the word never had it.

<a id="busy-attr"></a>

## presence.mjs, createPresence, busyKind

`busy` names which kind of client is driving, or null. It only ever changes
the word while the state is `online`.
⚠️ AND THE ATTRIBUTE IS SET AT BUILD TOO, not only by `busy()`. The
stylesheet greys the word off `data-busy`, so a badge born busy said the
right words in the right colour of the wrong state: the check comparing
inks read them identical and was right to.

<a id="reserve-busy"></a>

## presence.mjs, createPresence, widest

The reserve has to cover every phrase this badge can EVER say, which
includes the busy variants: a reserve measured on the idle words would let
the badge grow the first time somebody else touched the instrument, which
is the twitch the reserve exists to prevent.

<a id="title"></a>

## presence.mjs, createPresence, title

🔴 TWO LINES, NOT A MIDDOT, AND A `title` REALLY DOES BREAK ON `\n`.
Instructed 2026-09-19: no middots in anything a visitor reads. This one
reached every presence badge in the project, and it was gluing three facts
into one string: what the thing is, what it is doing, and the detail. The
first two are one phrase and are joined the way the badge's own visible
word already joins them, with a space (see `phrase` above, which has always
done it that way, so the middot here disagreed with the badge an inch
below it). The detail is a second fact and gets its own line, which is also
what CLAUDE.md's tooltip rule asks for: two or three short lines, never a
sentence with joins in it.

<a id="word-fade"></a>

## presence.mjs, createPresence, word fade

🔴 THE WORD CHANGES BY FADING THROUGH, AND THE REASONS ARE ALL ABOUT WHEN
IT HAPPENS. Asked 2026-09-16: *"how to animate online status srtings when
they change?"*.

A state change is an EVENT, not a clock: it happens when something actually
happened, so unlike a live number this is allowed to move at all. What it
may not do is any of the three things this repo has already been bitten by.
It cannot change width, because the reserve holds the widest word this badge
can say and the swap happens inside it. It cannot slide, because a slide
needs room to slide through and this box has none. And it cannot be slow:
90 ms out, swap, 90 ms back is under a fifth of a second, which is enough to
catch an eye that was elsewhere and too short to sit and watch.

⚠️ THE TEXT IS SWAPPED AT THE TROUGH, not at either end, so a reader never
sees two words in the same place. It is one element rather than two crossing
over, because two would need absolute positioning inside a reserve that is
already doing that job.
⚠️ AND A SCREEN READER HEARS IT WITHOUT ANY OF THIS: the badge is a live
region, so the word is announced on change whether or not it faded.

<a id="fade-not-restarted"></a>

## presence.mjs, createPresence, paint

🔴 A FADE ALREADY RUNNING TO THIS WORD IS NOT RESTARTED, AND LEAVING THAT
OUT MADE THE BADGE DISAPPEAR. PHOTOGRAPHED 2026-09-16: a green dot with
nothing beside it and the reserve still holding the space.

`/knobs/` calls `seen()` on every audio frame, which is fifty times a
second, and each call re-derived and repainted. During the 90 ms trough
the element still holds the OLD word, so every repaint saw a difference,
cleared the pending restore and started another: the text was swapped and
brought back only once the frames stopped. A state change is an event and
the fade belongs to the change, not to whoever asked again.

<a id="asking"></a>

## presence.mjs, createPresence, asking

⚠️ ONLY OVER `unknown`. Asking while the board is already answering would
hide a live heartbeat behind a question nobody needs the answer to, and
asking while it is KNOWN silent would erase a measurement that was taken.

<a id="seen"></a>

## presence.mjs, seen

It spoke. Stamp it with YOUR clock, at the moment it arrived.
⚠️ CHEAP ON PURPOSE. A page with audio calls this fifty times a second,
so it records the time and derives only when the answer could have
changed: while the thing is already `online` and nothing else is
pending, the next tick of `follow()` will say the same word anyway.

<a id="busy"></a>

## presence.mjs, busy

Somebody else is driving the thing this badge is about, or nobody is.
`kind` is one of the keys of `busyWords`, or null for nobody.
⚠️ IT DOES NOT TOUCH PRESENCE. A board being driven is still offline if it
has stopped answering, and this only ever changes the word while the state
is `online`.

<a id="presence-button"></a>

## presence.mjs, createPresenceButton

A primary control that IS the status, rather than a button beside one.

🔴 ASKED FOR 2026-09-21: *"replace listen primary buttons to somehign that
uses online status"*. A page that talks to an instrument in another room, or
on another cable, has two facts to show and had been showing one: `Listen`
says what pressing does and says nothing about whether anything answered. A
visitor who pressed it and saw no movement could not tell a silent instrument
from an absent one.

⚠️ **IT STAYS A PRESS, AND THAT IS NOT NEGOTIABLE.** A badge that connected
on its own would open MIDI, or a socket, on a VISIT, which is the rule this
project has paid for on four pages. So the control is a button whose face is
a live badge: `unknown` before anybody asks, `checking` while it looks,
then `online` or `offline` with a reason.

⚠️ **AND IT LIVES IN `.pos-controls`**, which is where `demo/verify.mjs`
presses. A status control outside that row is a control no harness drives,
and every check behind it would go silent while the suite stayed green.

`of` names the thing, `press` is what the button does, and everything else is
handed to `createPresence`. Returns the presence api with `el` being the
BUTTON, plus `badge` for the element inside it.

<a id="wrap-badge"></a>

## presence.mjs, createPresenceButton, badge

⚠️ `badge` WRAPS A BADGE SOMEBODY ELSE ALREADY DRIVES, added 2026-09-30 for
    `/away/`: *"listen + online is same button"*. That page's badge belongs to
    `createBoard`, which moves it from the board's own messages, and a second
    badge built here would be a second copy of one fact that could disagree
    with the first. Omitted, this builds its own exactly as before.

<a id="secondary"></a>

## presence.mjs, createPresenceButton, class

⚠️ SECONDARY, NOT PRIMARY. Asked 2026-09-21: *"secodard button for
    status butotn"*. A primary button is the one thing a page wants you to
    do, and checking whether an instrument is plugged in is not it: the
    page is the instrument, and this is the thing you press once before
    using it. Filling it in also made a status the loudest object on a page
    whose whole subject is a panel.

<a id="aria-label"></a>

## presence.mjs, createPresenceButton, aria-label

⚠️ THE BADGE'S OWN LIVE REGION STAYS. Wrapping it in a button must not take
    the announcement away, so nothing here touches `aria-live`; what the button
    adds is a name for the ACTION, which the badge cannot carry.
🔴 THE NAME OF THE ACTION, AND A CALLER MAY SAY ITS OWN SINCE 2026-09-22.
    The default is right for the case this was written for, which is a page
    asking whether a thing on a cable answered. It is WRONG for an instrument
    header, where the same badge inside the same button switches something on
    and off, and `check whether PLAI is there` would be the only channel a
    screen reader gets describing an action that is not what happens. A label
    that names the wrong verb is the lying control rule arriving where nobody
    can see it.

<a id="delegated"></a>

## presence.mjs, createPresenceButton, this_

🔴 DELEGATED, NOT SPREAD. `{ ...badge }` reads every property ONCE at
    spread time, so `get driver()` would have been frozen at whatever it was
    the instant this was built and would never have changed again. A getter
    that silently stops getting is the quietest kind of dead code there is.

<a id="test-header"></a>

## presence-test.mjs, file header

demo/shell/presence-test.mjs — the presence rule, with no browser at all.

  node demo/shell/presence-test.mjs

`presenceOf` and `wirePresence` are pure: no clock, no socket, no element. So
the whole of the policy is gradable here, which matters more than usual for
this subject, because THE PAGE THAT SHOWS IT CANNOT BE GRADED BY WATCHING.
The thing on the far end is a Raspberry Pi in another building; the failure
this component exists to stop is a badge that says `offline` about a board
that is fine, in the two seconds before the first heartbeat lands, and you
only ever see it if you happen to be looking at the right two seconds.

SIX OF THESE ARE NEGATIVE CONTROLS: they are written so the bug they name
would fail them, rather than so today's code passes. Two of them were proved
by breaking the module on purpose:

  1  the `coming` check moved above the `online` check, which is the
     plausible ordering bug: a board answering normally would pulse as
     "coming online" for as long as a page forgot to clear its own flag.
     MEASURED 28/28 -> 27/28, and the one that went red is the one written
     for it.
  2  the "never heard, nobody listening" case answering `offline` instead of
     `unknown`, which is the exact defect the fourth state exists to prevent.
     MEASURED 28/28 -> 25/28, and the third failure is the good one: the
     walk at the bottom stops reaching all four states at all.

<a id="test-silence-at-start"></a>

## presence-test.mjs, 6, silence at the start

── 6. NEGATIVE CONTROL: silence at the start is not absence ────────────────
🔴 THIS IS THE STATE THE COMPONENT EXISTS FOR. A page that opens on
`offline` is asserting a measurement of hardware in another building that it
has not taken. CLAUDE.md: "we did not look" must not read as "it is missing".

<a id="test-future-stamp"></a>

## presence-test.mjs, 9, a stamp from the future

── 9. NEGATIVE CONTROL: a stamp from the future is not a measurement ───────
Every envelope on this relay carries `at`, written by the SENDER's own clock.
A board running three minutes fast would read as freshly heard from forever
after it died, which is the worst shape a presence badge has: confidently
green about something that is gone.

<a id="test-beats-greys"></a>

## presence-test.mjs, 10, beats both greys

── 10. it beats both greys ─────────────────────────────────────────────────
Yoshimi takes ten to forty seconds to come up on a cold board. For all of it
the honest answer is that something is happening, and `offline` there reads
as a dead button.

<a id="test-loses-to-beat"></a>

## presence-test.mjs, 11, loses to a beat

── 11. NEGATIVE CONTROL: and it loses to a beat ────────────────────────────
The ordering bug. With the `coming` check above the `online` one, a board
that is answering normally shows a pulsing badge for as long as a page forgot
to clear its flag, which reads as "still starting" about a thing that started.

<a id="test-no-default"></a>

## presence-test.mjs, 15, no default interval

── 15. no default for the interval ─────────────────────────────────────────
🔴 A DEFAULT HERE WOULD BE A BADGE THAT FLICKERS GREY ON WORKING HARDWARE.
One second against a five-second beat calls the board gone between every
beat, and the person who goes to look at the board finds nothing wrong.

<a id="test-reason-survives"></a>

## presence-test.mjs, 19, the reason survives

── 19. the reason survives, because the reason is the useful part ──────────
`openWire` asks `/room/<name>/stats` when an upgrade fails and can say "the
room is full at 16 of 16". A badge that drops that is a badge that sends
somebody to debug a Pi over a relay that refused the socket.
⚠️ THE FIXTURE IS `wire.mjs`'s OWN SENTENCE and was copied from it, so it
changed when that sentence lost its middot on 2026-09-19. A fixture that
drifts from the string it stands for is a test about nothing.

<a id="test-reachable"></a>

## presence-test.mjs, 21, every derived state reachable

── 21. every DERIVED state is reachable ────────────────────────────────────
A state no input can produce is dead code wearing a colour.
⚠️ `checking` IS NOT ONE OF THEM AND MUST NOT BE. It is not a fact about the
far end: it is this page saying a question is out, so no arrangement of
heartbeats may produce it. The control at the bottom is that half.

<a id="test-no-em-dash"></a>

## presence-test.mjs, 23, no em dash

── 23. nothing a visitor reads carries an em dash ──────────────────────────
CLAUDE.md, checked in code rather than swept by hand, for the same reason
`looper-test.mjs` checks it: a formatter can put one back on every string at
once and a sweep cannot see that coming.

<a id="test-wired-collides"></a>

## presence-test.mjs, 23b, WIRED collides on purpose

── 23b. `WIRED` covers every state, and collides on purpose ────────────────
🔴 IT BREAKS THE RULE CHECK 22 MAKES, AND THAT IS THE POINT OF WRITING IT
DOWN. Five states map onto THREE words: `checking` and `coming` both read
`connecting`, because a cable has no difference between *we are asking* and
*it is starting up*; `unknown` and `offline` both read `not connected`, which
was asked for directly (*"unknown: not connected"*, 2026-09-21).
⚠️ SO THE DOT CARRIES THE WHOLE DISTINCTION between the collided pairs, and
`unknown` is drawn as a hollow ring for exactly that reason. A future reader
who "fixes" this to satisfy check 22 has undone an instruction, which is why
the collision is asserted rather than merely tolerated.

<a id="test-never-invents-checking"></a>

## presence-test.mjs, heartbeat never invents checking

── NEGATIVE CONTROL: a heartbeat never invents `checking` ────────────────
The state means "we asked and nobody has answered yet", which is a fact about
the PAGE and not about the board. If a derivation could produce it, the grey
axis would stop meaning what it says: a reader could not tell a question that
is out from a thing that is genuinely unmeasured.
