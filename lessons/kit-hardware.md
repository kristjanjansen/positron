# Kit lessons: hardware

The longer comments cut from `demo/shell/hardware.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-hardware.md#<anchor>`.

<a id="header"></a>

## `hardware.mjs` module header

```text
demo/shell/hardware.mjs — the ONE way a demo asks for real hardware.

Sound and MIDI are the two things on this site a page cannot simply have:
both need a user gesture (iOS grants audio only inside one, and Chrome
prompts for MIDI), both can be absent, refused, or present-but-empty, and
both were being hand-rolled per page with a different answer each time.

  const hw = createHardware(d, { onAudio, onMidi });

Rules it enforces so no page has to remember them:
  · ONE gesture buys both. Two buttons means two gestures and a page that
    works differently depending on which you pressed.
  · NEVER AWAIT `ctx.resume()`. It does not reject when refused — it simply
    never settles, so anything after it never runs. Two demos lost a session
    to this.
  · REPORT THE CAPABILITY, NOT THE ERROR. "no such API", "you said no" and
    "granted, nothing plugged in" are three different answers, and collapsing
    them into one error string is how this project once published a false
    claim about iOS. Each gets its own words.
  · A device list is a CHOICE, not a guess. If there is more than one output
    the page offers them; it defaults to the first and says which.
  · `onMidi(port, access)` hands over the whole access object, not just the
    chosen output. A loopback port (macOS IAC) returns everything sent to it
    on the matching INPUT, which is the only way to measure what the output
    lane actually did without external hardware.
```

<a id="label"></a>

## `hardware.mjs` button label

```text
⚠️ THE LABEL WAS `Enable soundcard / MIDI and play` UNTIL 2026-10-05, and a
review of `/time/` called it unclear: `enable` and `soundcard` are the
machine's words, and the slash glued two clauses into one. What a visitor
gets from the press is the beat played out loud and a MIDI prompt, so the
label says that. Nothing reads it back: callers hold `button`.
```

<a id="pickers"></a>

## `hardware.mjs` pickers

```text
TWO pickers, each labelled in the UI with its direction. MIDI in and MIDI
out are different devices doing different jobs — one is told when to act,
the other reports when something happened — and a control called just
"MIDI" cannot say which one you are choosing.
```

<a id="controls-row"></a>

## `hardware.mjs` controls row

```text
ALL THREE LIVE IN `.pos-controls`. Two reasons, and both were learned the
hard way in one sitting: verify.mjs presses every button in that row and
nothing else, so a control mounted anywhere else is one the suite cannot
reach — it read as "page asserted nothing" and looked like a broken demo.
And a device picker that sits BELOW the thing it configures reads as
output rather than as a control; it belongs beside the button that turned
the device on.
```

<a id="only"></a>

## `hardware.mjs` only

```text
ONE PLACE SAYS WHAT MIDI IS DOING, and it is the picker itself. A separate
status line repeated what the picker and the readout already showed, and a
second copy of a fact is a second thing that can be stale. Anything that is
not a device — unsupported, refused, none plugged in — becomes the picker's
only (disabled) option, so the control is always the answer.
```

<a id="refreshout"></a>

## `hardware.mjs` refreshOut

```text
The picker appears as soon as access is granted, even with nothing
plugged in — an empty list saying "no MIDI device" tells you the page
looked and found none, where a hidden control is indistinguishable
from a page that never asked. It also has somewhere to put a device
when you plug one in, which `onstatechange` will do live.
```
