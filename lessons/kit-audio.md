# Kit lessons: audio

The longer comments cut from `demo/shell/audio.mjs` and `demo/shell/audio-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-audio.md#<anchor>`.

<a id="header"></a>

## `audio.mjs` module header

```text
demo/shell/audio.mjs: one AudioContext per page, and one slot sounding in it.

  import { sharedAudio, claim, release, contexts } from '/shell/audio.mjs';

🔴 WHY IT EXISTS. Thirteen files built their own AudioContext on 2026-10-06
(`plans/plan-live-slides.md` section 3.4, MEASURED with `grep -c`) and no
shared one existed. A page with two players, or a deck on `/fau/`, would make
a second sound device for the same pair of speakers. This module is the one
place a context is made, and the one place that says who is using it.

── THE FOUR VERBS ─────────────────────────────────────────────────────────

`sharedAudio({ sampleRate })` makes the context on its FIRST call, inside the
gesture that asked for it, and hands back the same one afterwards with a
`resume()` fired and not awaited. `claim(owner)` makes `owner` the one thing
sounding on this page and calls the previous owner's `stop()`. `release(owner)`
lets go and suspends the context when nobody holds it. `contexts()` counts
the contexts this module has made, which is what a check reads to say a visit
or a step opened no sound device.

🔴 NOTHING HAPPENS ON IMPORT. No context, no listener, no `window` or
`document` read. A page may import this on a visit and pay for a few hundred
bytes of module and nothing else; the visibility listener is added when the
first context is made, because before that there is nothing to stop.

🔴 48000, BECAUSE PLAITS REQUIRES IT AND NOTHING ELSE HERE MINDS. `/muta/`
refuses any other rate (READ, `plan-live-slides.md` 2). Faust takes the
context's rate, scsynth takes the context it is handed, `/nola/` decodes into
whatever it gets. A caller asking for a rate the existing context does not
have still gets that context, because one page has one device: compare
`ctx.sampleRate` with what you asked for and SAY so, the way `/muta/` reports
a 44100 today. A second return channel for one comparison the caller can make
itself would be a second copy of a fact.

🔴 SUSPEND, NEVER CLOSE. A closed context cannot be reopened, so the next
press would have to build a new one and register every worklet again. A
suspended one costs the audio thread nothing and keeps every processor it
has, and the next press is a gesture anyway, which is what `resume()` wants.

🔴 ONE OWNER, AND ITS STATE IS SET BEFORE THE PREVIOUS OWNER IS STOPPED.
A slot's `stop()` usually ends with `release(this)`. If the new owner were
written after that call, the old owner's release would find itself still
the owner, clear it and suspend the context the new owner is about to sound
in. `audio-test.mjs` carries that exact case as a negative control.

🔴 NO SUSPEND WHILE A RESUME IS IN FLIGHT. MEASURED 2026-10-06 in headless
Chrome, outside any positron page: `resume()` on a suspended context leaves
`state` reading `suspended` for about 1.5 to 3 ms, and a `suspend()` in that
window stops the device without changing `state`; the resume then lands and
the context reads `running` with `currentTime` frozen, 25 trials of 40.
After that `resume()` resolves and does nothing, so every later press on the
page sounds silence until a reload. A Start on a broken edit did it on
`/kit/slides/`: the compile fails a couple of ms after the press resumed.
So a release that finds a resume in flight waits for it, then suspends only
if nobody has claimed in the meantime. `audio-test.mjs` carries the case
over a fake that orders the verbs the way Chrome does.

⚠️ WHAT AN OWNER IS: any object with a `stop()` method, compared by identity.
A page with one instrument passes one object for its whole life; a slide
passes itself.

⚠️ THE ARITHMETIC IS GRADED WITH NO BROWSER. `createAudioHub({ make, doc })`
is the whole module with its two globals handed in, and the functions this
file exports are one hub built lazily on the real `window` and `document`.
`node demo/shell/audio-test.mjs` drives a hub over a fake context.
```

<a id="wake"></a>

## `audio.mjs` waking a context on a phone

```text
── waking a context on a phone ─────────────────────────────────────────────

🔴 AN AUDIOCONTEXT MADE OUTSIDE A GESTURE STAYS SILENT ON AN IPHONE FOR EVER,
AND THE KIT KEYBOARD MAKES EVERY PAGE'S CONTEXT OUTSIDE ONE. Reported
2026-10-13 from an iPhone in Safari on /synth/keyboard/: *"Can not play
onscreen keyb on mobile (safari)"*. A finger on a key sounds two animation
frames after `pointerdown` (the swipe verdict in keyboard.mjs), so a page's
`ctx ??= new AudioContext()` runs inside a `requestAnimationFrame` callback,
which is no gesture at all. WebKit starts that context `suspended` and
nothing on those pages ever calls `resume()`, so every key after it schedules
sound into a clock that never moves. Desktop Chrome hides it twice over: a
harness passes `--autoplay-policy=no-user-gesture-required`, and Chrome
resumes a suspended context by itself when a source starts after the page
has had a gesture. WebKit does neither.

✅ `wakeAudioOnGesture()` RESUMES EVERY CONTEXT THE PAGE MADE, FROM INSIDE THE
NEXT TRUSTED GESTURE, whoever made it. It wraps the `AudioContext`
constructor in a Proxy that only records each instance (the object handed
back is the real one, so `instanceof`, `constructor` and every method are
untouched), and listens on `window` in the capture phase, so it runs before
any page handler on the same event.
⚠️ THE EVENTS ARE ALL OF THEM, ON PURPOSE. WebKit counts `touchend` (and so
`pointerup` from a finger) as the gesture that may start audio; `touchstart`
and a finger's `pointerdown` are not activation in the HTML spec and were not
in WebKit since iOS 9. A mouse's `pointerdown` and a `keydown` are. A
`resume()` outside a gesture is harmless and resolves later or never, so
calling it on every one costs nothing and covers every engine.
⚠️ IT RESUMES ONLY A CONTEXT THAT HAS NEVER RUN, OR ONE THE SYSTEM
INTERRUPTED. A context that has been `running` and is now `suspended` was
suspended by somebody on purpose, `release()` above being one, and waking it
on the next tap would undo that.
⚠️ THE FIRST TOUCH ON A FRESH IPHONE PAGE IS STILL SILENT, AND THAT IS NOT
FIXABLE FROM HERE. The context is made in the verdict frame, after the
`touchend` that could have started it has not happened yet; the `touchend`
that ends that same touch resumes it, and the page's own note off in the same
event cancels the note it was holding. Every touch after the first sounds.

🔴 THE SILENT SWITCH MUTES WEBAUDIO ON AN IPHONE UNLESS THE PAGE SAYS IT IS
PLAYBACK. WebKit's default audio session for a page is `ambient`, which
obeys the ring/silent switch, so a phone in silent mode plays a working
keyboard at zero. `navigator.audioSession.type = 'playback'` (Safari 16.4
and up) makes it media, which ignores the switch the way a video does. It is
set on the first gesture rather than on import, so a visit that never plays
changes nothing about the phone's audio. Where `audioSession` is missing
(older iOS, every non-WebKit browser) nothing is set and the switch still
mutes on an old iPhone; the silent `<audio>` element trick that covers that
case is NOT here.

⚠️ IT CANNOT SEE A CONTEXT MADE BEFORE IT WAS INSTALLED. The kit keyboard
installs it when it is built, which on every page is before the first press
and so before any page makes a context lazily.
```

<a id="test-header"></a>

## `audio-test.mjs` audio-test module header

```text
demo/shell/audio-test.mjs, the shared AudioContext's owner arithmetic, with
no audio at all.

  node demo/shell/audio-test.mjs

`audio.mjs` is one context and one owner, and every way it can be wrong is a
question of who is told what and in which order: a context made twice, a
visit that makes one, an owner that is not stopped when another claims, a
release from somebody who no longer owns it suspending the one who does, a
tab going to the background with a note still sounding. None of that needs a
browser, so a hub is built over a fake context that records what was done to
it, and the arithmetic is graded here.

🔴 EIGHT OF THESE ARE NEGATIVE CONTROLS, named NEGATIVE below: written so that
the bug they name fails them, rather than so that today's code passes. A hub
that never suspends and one that suspends on every call both look green to a
check that only asks whether claiming works.
✅ MEASURED 2026-10-06, five sabotages of a copy of `audio.mjs`, 25 ok before
each: the owner written AFTER the old owner's stop takes 2 red, a release
that does not check who is asking 3, a claim that stops nobody 1, suspend
replaced by close 5, and a background tab that stops the owner without
releasing it 1. Every one goes red on the check written for it.

NOT GRADED HERE: a real AudioContext, its sample rate on a real device, and
whether a suspended context really stops the audio thread. Those need a
browser and are the `/fau/` page's (it runs on this module) and, later, the
SLIDES page's (`plans/plan-live-slides.md` section 7).
```

<a id="test-import"></a>

## `audio-test.mjs` test: no globals on import

```text
🔴 NEGATIVE: a source claim, stripped of comments first, because the rule
   the header states ("no window or document read on import") would be
   matched by its own sentence otherwise. Anything at module top level that
   touches `document` or `window` or builds a context breaks it.
```

<a id="test-order"></a>

## `audio-test.mjs` test: order

```text
🔴 THE ORDER CASE. A's stop() released A from inside the claim; had the
   owner still been A at that moment, that release would have suspended the
   context B is about to sound in.
```

<a id="chromecontext"></a>

## `audio-test.mjs` chromeContext

```text
🔴 THE FAKE ABOVE FLIPS `state` THE MOMENT A VERB IS CALLED, AND A REAL
   CHROME DOES NOT. MEASURED 2026-10-06 in headless Chrome with a probe of its
   own (no positron page): `resume()` on a suspended context leaves `state`
   reading `suspended` for about 1.5 to 3 ms while the audio thread starts, and
   a `suspend()` called in that window is a no-op on `state` that still stops
   the device. The resume then lands and `state` reads `running` with
   `currentTime` frozen: 25 of 40 trials at 1.5 to 2.9 ms. A context in that
   shape is WEDGED: `resume()` resolves at once and changes nothing (0 ms of
   `currentTime` in 200 ms after it), and only a suspend then a resume brings
   it back. On `/kit/slides/` that was a Start on a broken edit (the compile
   fails in a couple of ms, so the release suspends inside the press's resume)
   followed by every later Start on the page sounding silence.
   This fake models exactly that, so the cases below grade the ORDER.
```
