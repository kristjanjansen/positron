# Kit lessons: cc-send

The longer comments cut from `demo/shell/cc-send-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-cc-send.md#<anchor>`.

<a id="header"></a>

## `cc-send-test.mjs` cc-send-test module header

```text
demo/shell/cc-send-test.mjs — what a hand on a slider puts on the wire.

  node demo/shell/cc-send-test.mjs

`makeCcSend` is pure: it holds no socket, no clock and no page, so the whole
of the send discipline is gradable here rather than by watching a board in
another building and wondering. That matters more than usual for this
subject, because EVERY FAILURE MODE OF A CONTROL PLANE IS SILENT. A value
thinned away leaves a filter in the wrong place with no error anywhere, and
the relay tells a sender nothing at all when its bucket bites.

FOUR OF THESE ARE NEGATIVE CONTROLS: they are written so the bug they name
would fail them, rather than so today's code passes.
```

<a id="t1"></a>

## `cc-send-test.mjs` test 1: a sweep is thinned

```text
── 1. a sweep is thinned to the gate's rate ────────────────────────────────
A finger on a slider emits as fast as the browser will report it. What can
be HEARD is bounded by the board's 20 ms audio frame, so everything above
one message per controller per frame is load nobody hears.
```

<a id="t2"></a>

## `cc-send-test.mjs` test 2: newest value kept

```text
2. NEGATIVE CONTROL. Thinning must keep the NEWEST value, not the one that
   happened to be in hand when the gate opened. A gate that sends a stale
   value is a filter lagging a finger, which reads as latency rather than
   as a bug.
```

<a id="t3"></a>

## `cc-send-test.mjs` test 3: endpoint

```text
── 3. the endpoint is never thinned ───────────────────────────────────────
The last value of a gesture is the one that stays true until the next
gesture, so it is the one value that must never be dropped. `createSlider`
gives this for free: `onInput` while moving, `onChange` on release.
```

<a id="t4"></a>

## `cc-send-test.mjs` test 4: per controller gate

```text
── 4. the gate is per controller ──────────────────────────────────────────
NEGATIVE CONTROL for the obvious implementation: one timestamp for the whole
gate. With that bug, the second slider is silenced by the first for a frame,
which is exactly the case this demo exists to show off.
```

<a id="t9"></a>

## `cc-send-test.mjs` test 9: relay bucket

```text
── 9. the arithmetic against the relay's real bucket ──────────────────────
⚠️ THE RELAY'S CAPS ARE 1000/s AND 2000 BURST SINCE 2026-09-13, read from
`workers/relay/src/index.js`. This is the load a two-slider sweep makes.
```

<a id="t10"></a>

## `cc-send-test.mjs` test 10: conservation

```text
── 10. what was offered is what was sent or was overtaken ────────────────
🔴 THE COUNTER THIS CHECK EXISTS FOR WAS WRONG AND NOTHING COULD DISAGREE
WITH IT. `thinned` counted ticks rather than values, so a page that ticks
more often than a hand moves reported more thinning for the same gesture.
A conservation law is what makes that visible.
```

<a id="t10-direction"></a>

## `cc-send-test.mjs` test 10: direction

```text
⚠️ THE DIRECTION IS THE CLAIM, AND WRITING IT AS "ABOUT THE SAME" WAS
WRONG. Draining less often really does let more values overtake each other,
so the two counts SHOULD differ and the slow one should be larger. What
must never happen is the opposite: ticking MORE often reporting MORE
thinning, which is what the old counter did, because it was counting the
page's timer rather than the hand.
```
