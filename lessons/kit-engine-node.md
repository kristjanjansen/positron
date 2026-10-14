# Kit lessons: engine-node

The longer comments cut from `demo/shell/engine-node.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-engine-node.md#<anchor>`.

<a id="header"></a>

## `engine-node.mjs` module header

```text
demo/shell/engine-node.mjs: a sound engine page as a node on the patchbay.

Step 5 of `plans/plan-routing-migration.md` for an ENGINE page (§2.1: "an
engine node with a `midi` in port; local only", and for `/collide/` "sclang
as `program`"). The page stays what it was. What this adds is that, after a
press of Join, `/patchbay/` can see it and link to it:

  site:<slug>               an `engine` node, place `browser`
  site:<slug>:midi    in    the notes the engine plays
  site:<slug>:audio   out   its sound, which travels by `webaudio` only,
                            because nothing in a browser sends a page's sound
                            anywhere yet (plan §3.1, no browser PCM sender)
  site:<slug>:program in    only where the page compiles a program (`collide`)
  site:<device>:out / :in   this browser's MIDI devices, by `midi-graph.mjs`

It is all one graph on one site, because the registry keeps one graph per
socket and site and a second graph on the same site would replace the first.

ONE COPY SINCE 2026-10-14. It was `demo/collide/engine-node.mjs` with a byte
identical copy in `demo/muta/`; both pages import it from here now.
⚠️ `demo/fau/engine-node.mjs` (used by /fau/ and /nola/) is a DIFFERENT
module that also names this path as its future home. Merging the two is
still open (BACKLOG, routing follow-ups item 1).

WHAT A LINK REQUEST GETS, for a port this page owns:
  device out -> this engine's midi   open: yes once the sound is up, and the
                                     badge on the panel starts counting that
                                     device's notes; before, a refusal that
                                     says a touch starts the sound.
                                     close: refused in words, because the
                                     page plays every MIDI input it has and
                                     `midi.mjs` cannot leave one out.
  device out -> device in            a real link, run through route-core by
                                     `midi-graph.mjs`; close releases notes.
  this engine's audio -> anything    refused: the sound plays here only.

⚠️ A VISIT OPENS NOTHING. Nothing here runs until `join()`, which a person's
press of Join calls, or a page's own check pass under `?selfcheck=1`.
🔴 AND UNDER `?selfcheck=1` THE ROOM IS A BUS INSIDE THIS TAB, NOT A SOCKET.
The relay hop is graded by `bay-node-test.mjs` and by `/patchbay/`'s own
round trip; what this page can get wrong is what it announces and how it
answers, and an in-tab bus grades both with no socket to anybody's relay.
The MIDI devices in that pass are two fakes handed to `join({ access })`, so
the check asks the browser for nothing either.
```

<a id="note-quiet-ms"></a>

## `engine-node.mjs` NOTE_QUIET_MS

```text
How long a linked keyboard may be quiet before the badge says stalled. Notes
are sparse: somebody listening to a held chord is not a stalled link, so this
is far longer than the two seconds a picture gets.
```

<a id="badge-wrapper"></a>

## `engine-node.mjs` badge wrapper

```text
🔴 THE BADGE SITS IN A WRAPPER THIS FILE HIDES, BECAUSE `hidden` ON THE
   BADGE ITSELF DRAWS NOTHING AWAY. MEASURED 2026-10-06 by screenshot: the
   kit's badge read `NOT RECEIVING` on a visit with `el.hidden === true`,
   because the presence badge's own `display` beats the browser's `[hidden]`
   (positron-ui, the `[hidden]` and `display` section). A plain span has no
   display rule, so its `hidden` holds, and the checks read the computed
   display rather than the attribute. Reported for `link-badge.mjs`.
```
