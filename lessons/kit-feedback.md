# Kit lessons: feedback

The longer comments cut from `demo/shell/feedback.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-feedback.md#<anchor>`.

<a id="header"></a>

## `feedback.mjs` module header

```text
demo/shell/feedback.mjs — the box behind the button beside every demo title.

A visitor writes four lines and presses send. The lines go over the project's
own relay, into a room of their own, to `workers/feedback` — which joined
that room as an ordinary socket, exactly the way `workers/store` does, so the
relay still parses nothing. Then the page READS THE NOTE BACK over HTTP
before it says the word "kept", because an unconfirmed send is the one thing
a feedback button must never do: a control that reports success it has not
checked is worse than one that reports failure.

🔴 A SUITE RUN MUST NOT BE ABLE TO WRITE INTO THE REAL ROOM, and that is the
whole reason this file is shaped the way it is. `demo/verify.mjs` presses
every control on every page on every run, and CLAUDE.md records what happened
the last time a shared resource sat behind forty partitioned ones: one FCM
topic, and every run of the suite sent two real notifications to every real
subscriber, for a day, before anyone outside said so. The rule it left behind
is an allowlist of ONE, never a test for things that LOOK like tests, because
the default has to be silence.

There are four gates and three of them hold on their own:

  1. THE ROOM COMES FROM THE ORIGIN, exact match, one entry. Anything that is
     not `https://positron.studio` writes into `feedback-dev`, which is a
     different Durable Object that the real table never reads.
  2. THE SERVER DECIDES THE SAME THING, from the `Origin` header on `/arm`,
     which a page cannot forge. No query parameter, body field or path can
     move a write into the real room. A harness on 127.0.0.1 is refused the
     real room by the server, not by its own good manners.
  3. THE RECORDER REFUSES a note whose declared origin is not the live one,
     so a write into the real room has to LIE rather than slip in while a
     real visitor happens to be holding the room open. Proved by sending one:
     echoed by the relay, refused by the recorder, 0 rows.
  4. ONLY A PERSON CAN PRESS SEND. `shell.mjs` refuses an untrusted click,
     so `element.click()` — which is how this harness presses everything —
     does nothing at all, and `mount()` proves it by trying on every page.

⚠️ GATE 1 IS ALSO WHY THE ROUND TRIP CAN BE CHECKED AT ALL. The sandbox room
is a real room with a real recorder and a real table, so `/feedback/` drives
the whole chain — arm, relay, recorder, SQLite, HTTP read — every time the
suite runs, and lands in a store nobody reads. A guard that made the feature
untestable would have been traded for one that makes it untested.
```

<a id="live-origin"></a>

## `feedback.mjs` LIVE_ORIGIN

```text
🔴 THE ALLOWLIST. `workers/feedback/src/index.js` holds the same three lines
and the two are CHECKED AGAINST EACH OTHER on every send — the page says
which room it expects, the server says which room it picked, and a send
stops if they differ. A shared decision in two files is a decision that will
disagree; this one cannot disagree quietly.
```

<a id="max-chars"></a>

## `feedback.mjs` MAX_CHARS

```text
A relay message may be 1000 KiB, which is not a limit anybody typing into a
four line box will meet. This one is a limit a person can reach by pasting,
and it is refused IN WORDS with the count, rather than by a `maxlength` that
silently stops the keyboard working.
```

<a id="sendnote"></a>

## `feedback.mjs` sendNote

```text
Send one note and confirm it is stored. Never throws; it returns what
happened in a sentence the panel can print.

⚠️ IT IS NOT THE BUTTON'S HANDLER. The button is guarded on `isTrusted` in
`shell.mjs`; this is the plain function underneath it, so `/feedback/` can
drive the whole chain as a check without synthesising a press. A page calling
it is bound by gates 1 to 3 exactly as a person is.

@returns {Promise<{ok:boolean, said:string, id?:string, room?:string}>}
```

<a id="full-room"></a>

## `feedback.mjs` full room

```text
⚠️ A FULL ROOM IS A SILENT OUTAGE AND A BROWSER CANNOT READ THE STATUS OF
A FAILED UPGRADE. `studio-1` sat at 16 of 16 for hours reading as a
network fault on the Raspberry Pi. `/stats` is an ordinary CORS-clear GET
and it answers with `sockets` against `limits.maxSockets`, so ASK rather
than infer from a silence. Best effort, and never in the way of the
sentence that is already true.
```

<a id="read-back"></a>

## `feedback.mjs` read back

```text
3. and the only claim worth making: it is IN THE STORE, asked of the same
   address an agent reads. Not an acknowledgement somebody sent us.
```

<a id="openfeedback"></a>

## `feedback.mjs` openFeedback

```text
The panel. Built once, on the first press, and shown and hidden after that.

🔴 IT IS A FIXED OVERLAY AND IT IS APPENDED TO `document.body`, not into the
page. Two rules meet here. CLAUDE.md: nothing that changes while somebody is
looking at it may change how much room it takes — a panel unfolding under the
title would push a canvas, a readout, a transport bar and a log down the page
every time it opened. And the shell's vertical rhythm lives on
`.pos-stack`, so anything dropped inside the page would take the project's
one gap, which it has no business taking. Fixed and outside, nothing moves.
```

<a id="title"></a>

## `feedback.mjs` title

```text
🔴 THE PAGE'S NAME IS IN THE TITLE, WHICH IS WHERE THE NOTE USED TO PUT IT.
`feedback` plus a paragraph saying "About crate" is the same fact twice, and
the paragraph was the half that cost two lines and a gap. `crate feedback`
says which page this is about in the place a reader looks first.
```

<a id="no-sandbox"></a>

## `feedback.mjs` no sandbox notice

```text
🔴 NO SANDBOX NOTICE. Asked 2026-09-16, in full: *"rm This copy is not the
published site, so it goes to a sandbox that nobody reads."*
It was there because a page that is not the published site must not look as
though it is collecting anything. Two lines of apparatus about the copy you
are running is the wrong thing to put in front of somebody who opened a box
to say something, and the only people who ever see it are the two of us
running the dev server. The routing is unchanged: `roomFor(origin)` still
sends a note from anywhere but `positron.studio` to `feedback-dev`, and the
panel still prints the room it landed in after a send.
```

<a id="message-field"></a>

## `feedback.mjs` message field

```text
⚠️ NO `grow: 'wide'`. That variant is a flex BASIS, and the basis in this
column is the height — see `.pos-fb-box > .pos-field` in shell.css.
```

<a id="send-button"></a>

## `feedback.mjs` send button

```text
🔴 THE ORDINARY BUTTON, NOT THE PRIMARY ONE. Asked 2026-09-16: *"fields:
have buttons heiht. use secondary button here"*, with a photograph of the
yellow Send standing taller than the name field beside it.

Both halves of that report are one cause. `.pos-field input` and `button`
are both 34 px and always were; what made Send bigger is `button.pos-pri`'s
`box-shadow: 0 0 0 1px`, which paints a ring OUTSIDE the border and reads
as two more pixels of height and width that no layout number accounts for.
Dropping the primary treatment puts the two controls on the same edge.

⚠️ AND IT IS THE RIGHT WEIGHT ANYWAY. The site's yellow is spent on the
thing that is running; this is a dialog where Send is the only action, so
nothing is competing with it and nothing needs to shout. Return fires it,
which is the other half of being the default.
```

<a id="throttle"></a>

## `feedback.mjs` send throttle

```text
⚠️ ONE SEND AT A TIME, AND A FLOOR UNDER TWO OF THEM, BECAUSE THIS IS THE
ONLY PLACE A PERSON HOLDING THE BUTTON DOWN IS BOUNDED. The relay's bucket
is 1000 messages a second with a burst of 2000 (read off the deployed
worker, not remembered) and it tells a sender NOTHING when it bites, so it
is no help at all here. And the recorder's twenty-a-minute cap counts a
SOCKET, while every send here opens a fresh one — so it catches a script
holding one connection open and floods it, which is the shape a flood
actually takes, and it does not bind a person pressing a button. That
person is bound here: disabled while one send is in flight, and refused
with a reason inside two seconds of the last.
```

<a id="keydown"></a>

## `feedback.mjs` keydown

```text
🔴 SEND IS THE DEFAULT BUTTON. ASKED FOR: *"defaul button on feedback
modal"*. Escape closes and Return sends, which is the pair every dialog a
reader has ever used gives them, and this panel had only half of it.

⚠️ NOT A PLAIN RETURN IN THE MESSAGE BOX. That is a four row `<textarea>`
and Return there is a NEW LINE — the one keystroke somebody writing a
paragraph presses most. Taking it would send half a note on the first
sentence, which is worse than having no default at all. Cmd or Ctrl and
Return is the escape hatch there, and it is the same combination Slack,
GitHub and every other box like it uses.
⚠️ AND IT IS NOT A `<form>`. A form would give Return for free and would
also give a page navigation on submit: the panel lives inside a demo that
is playing sound, and a navigation stops it. `preventDefault` on a listener
is the version with no way for that to happen.
```
