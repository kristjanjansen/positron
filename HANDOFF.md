# Handoff, 2026-09-18, session 33

**DEPLOYED, 2026-09-18.** The site is live at BUILD `77a9d9d-072604-1fb2`,
confirmed ON THE EDGE by `deploy.mjs` rather than assumed, and the mail worker
is live as version `50a78731` at 100%. The tree was clean when both went out, so
neither shipped anybody's in-flight work.
🔴 **THE BOARD IS THE ONE THING STILL NOT DEPLOYED**, and it cannot be from
here: it answers over the relay and refuses ssh. See below.
⚠️ **"Leave err alone"**, instructed 2026-09-18. Nothing in this session probed
an ERR mount and nothing should. The two ERR items below are written down and
left alone deliberately.

## Seven backlog items were asked for at once, and one arrived mid-session

All eight are finished. Two of them were finished before the session started and
nobody had struck the line off, which is its own lesson: **a backlog entry is a
claim about the world that goes stale exactly like a comment does.**

**435/435 green** across the twenty local pages this session touched, in one
run: `kit radio tapes replay resources strip typist vclick show loops score
transport patch draw instrument looper take record capture memento`. The pages
that need ERR, a relay, Cloudflare or the board were deliberately not run and
are named where that matters.

## What landed

**The mail parser has the tests the classifier already had.** `firstText` lived
inside `index.js` beside a `fetch` and a WebSocket, so nothing could import it
and it had ZERO asserts, while `spam.mjs` next door had 51. That is the whole
story of how a real Gmail message put its HTML half in the feedback room while
the suite was green. It is `workers/mail/src/body.mjs` now. **75/75, up from 51.**
⚠️ **THE HTML HALF WAS ALREADY FIXED AND THE ROOM ENTRY WAS OLD.** Both real
messages were captured from the sender's own mailbox and are fixtures now, byte
for byte at 542 and 539 bytes. Run against the SHIPPED code the 19:54 message
returns exactly `hello!`. The deploy went out between the two messages, which is
also why one is labelled `[ok]` and the other is not.
⚠️ **WRITING THE FIXTURES FOUND THREE REAL DEFECTS THE ROOM HAD NEVER SHOWN**:
an attachment wraps the words in a second multipart and the whole inner
structure came back as the message; a message with no closing delimiter lost its
only part to `slice(1, -1)`; and one whose line endings had been normalised
matched no `\r\n\r\n` and returned its own headers as the body.

**RFC 2047, so a subject from outside English is readable.** And the BODY with
it: a subject is encoded because the alphabet forced it, and the same message's
body is quoted-printable for the same reason, so decoding only the subject would
have put correct words over mojibake.

**The verdict says which signal decided it.** `auth.via` held that the whole
time and went only to `console.log`. `[ok · via Authentication-Results]` against
`[ok · via ARC]`, with the negative control that gives it meaning.

**The board can be looked at from outside the building.** `box.ping` replied
with an `at` field, `at` is an envelope field, so `format()` threw and the verb
had replied to nobody since it was written. Two new verbs: `jack.graph` reads
and changes nothing, `jack.rebuild` is a diff rather than a teardown and kills
no process. **92/92, up from 67**, two sabotages take it to 88 and 90.

**Forty pages stopped running their checks at the people reading them.** The
gate is a kit module now, `demo/shell/selfcheck.mjs`.

**`/tapes/` has a stand-in, `demo/fake-tapes.mjs`.** 38/38 with the only hosts
contacted being the dev server and the stand-in.

**Glue left the docs and started doing its job.** `/stage/`, `/radio/`,
`/replay/`, `/tapes/`.

**The five black keys were already where a piano puts them** (`8bdd489`,
2026-09-17). Verified by measurement rather than by reading the diff: narrowest
white strip **27.0 px, 0.551 of a white key**, against 0.401 centred. Exactly
the predicted figure.

## 🔴 What still needs a person

⚠️ **THE MAIL DECODER IS LIVE AND HAS NOT YET MET A REAL MESSAGE.** It is
graded by 75 asserts including both real Gmail messages as fixtures, but nothing
has arrived at `positron@positron.studio` since it went out. The next one
settles it, and it settles the auth question too, because the verdict now names
the stamp that decided it. Read the room with the command in the watermark
section.

**The board code has never met a JACK server.** It answers over the relay and
refuses ssh from here, so `jack.graph` and `jack.rebuild` are unverified on
hardware and say so in their own comments.

```sh
cd rig/box && ./push.sh            # writes /opt/positron-box, restarts, prints md5s
node rig/box/ask.mjs --room studio-1 jack.graph
```

If `jack.graph` comes back as nothing at all, the board is still on the old
build: an unknown verb falls through to `default` and is answered with silence.

## 🔴 Two things that now cost somebody else, and did not before

**`node demo/verify-gl.mjs videoradio` costs ERR.** `verify-gl.mjs` and
`verify-quest.mjs` never appended `selfcheck=1`; only `verify.mjs` did. So
`/videoradio/`'s checks had been running NOWHERE for two sessions. They run now,
and that page rotates four ERR mounts.

**`/reel/` opens two `arhiiv.err.ee` connections on every visit**, before
anything is pressed, and it is NOT a self-check: it is the page's deliberate
opening state, commented and argued for. The sweep left it alone because it is
outside what a sweep may decide. It is the `/tapes/` shape wearing a better
motive, and the decision is editorial.

## Rules that cost real time this session

🔴 **A CHECK THAT GRADES ONE HALF OF A FILE PROVES NOTHING ABOUT THE OTHER
HALF.** 51 green asserts sat beside a parser with none, in the same directory,
for as long as both existed. The question that finds this is not "is this
tested" but **"which of the things in here can be imported, and which cannot"**.
The untestable half is the half with no seam, and a seam is what a test needs.

🔴 **A GUARD THAT FIRES ON AN ACCURATE COMMENT TEACHES ITS AUTHOR TO WRITE A
WORSE COMMENT.** The purity check read the whole file including its prose, so
`body.mjs` failed it for the word WebSocket inside a sentence explaining that
the parser had been moved OUT of the file which holds one. It strips comments
now, and there is a control that plants a real call and requires it to be
caught, because a stripper is a thing that can be wrong.

⚠️ **A LITERAL CONTROL BYTE IN A SOURCE FILE IS THE `timeline/transport.mjs`
TRAP IN A NEW COSTUME.** A character class holding the real bytes rather than
`\u0000` and `\u001f` works perfectly, and a NUL among them makes BSD grep call
the whole file binary, so every search of it answers nothing at all. It happened
twice in one session: once in `body.mjs` and once in this file, while writing
this paragraph about it. Escapes, always.

⚠️ **"I CANNOT SSH TO IT" IS STILL NOT "IT IS DOWN", AND I SAID THE FIRST AND
NEARLY MEANT THE SECOND.** Port 22 on the board did not answer, which is in
CLAUDE.md as the wrong question to ask. One relay question answered immediately.

⚠️ **CONFIRM WHICH FOUR BEFORE GLUING FOUR.** `createGlue` had exactly one
caller, twenty pages carry both a strip and a transport bar, and a sweep on that
reading would have touched half the project for a request that said four.
