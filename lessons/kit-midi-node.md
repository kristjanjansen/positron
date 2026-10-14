# Kit lessons: midi-node.mjs

The long comments cut from `demo/shell/midi-node.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-midi-node.md#<anchor>`.

<a id="header"></a>

## midi-node.mjs, file header

demo/dump/midi-node.mjs: a WebMIDI page as a node on the patchbay, joined on
a press, with the links another page asks it to open.

🔴 STEP 5 OF `plans/plan-routing-migration.md`, 2026-10-06, for the four
WebMIDI device pages: `/circuit/`, `/evo/`, `/twelve/` and `/dump/`. Each
one already asks for MIDI on a press and listens to every input. What it
lacked is a way for `/patchbay/` to see this machine's instruments and link
them, which is plan §3.1's first gap, and `evo:out -> pi-1:circuit:midi-in`
is `plan-patchbay.md`'s own first demo.

⚠️ WHY THIS FILE LIVES IN `demo/dump/` AND NOT IN `demo/shell/`. It is
shared by four pages and belongs in the kit, as `demo/shell/midi-node.mjs`.
The agent that wrote it was allowed to edit these four page directories and
nothing in `demo/shell/`, and four copies of one file is the defect CLAUDE.md
names (*"anything shared is done once"*). Moving it is a `git mv` and four
import lines; nothing in it depends on where it sits.

WHAT IT DOES, AND WHAT IT LEAVES TO THE PAGE:
  1  NOTHING ON LOAD. Building it opens no socket and asks for no MIDI.
     `Join` is a press on its own row, which is NOT `.pos-controls`, so the
     harness never presses it and no other control's press moves. The page's
     own check pass grades it through `checkMidiNode`, against a relay that
     lives in this file, so a run opens no socket to anybody.
  2  THE ROOM AND THE SITE ARE `bay-node.mjs`'s: `?room=` when given, a
     private room under the harness, `studio-1` for a person, and a site of
     this tab's own, `web-<four>`.
  3  THE DEVICES ARE `midi-graph.mjs`'s, keyed by identity and never by name,
     announced with `place: 'browser'` because that is what `/patchbay/`
     reads to send a link out of them back here as `link.request`.
  4  THE LINKS IT OPENS WHEN ASKED, three kinds and nothing else:
       local  a device out to a device in on this machine, run through
              `route-core.mjs` by `midi-graph.mjs`;
       board  a device out to a board's MIDI in, through `route-core.mjs`
              with that port's own `accepts` and `never`, sent as the
              board's `midi.send`, which its gate checks again on the Pi;
       tap    a device out into `/dump/`'s own sink, counted here.
     Anything else is refused in words: page to page MIDI over the relay has
     no opener anywhere yet (plan §3.2).
  5  A BADGE ONLY WHERE THE FAR SIDE IS COUNTED (`link-badge.mjs`). A board
     link reads `midi.out` off the board's own `audio.status`; a tap counts
     what reached this page. A local link has no badge, because the only
     number there is what this page handed to the browser's `send()`, which
     is the near side of the cable (CLAUDE.md: a count is only evidence on
     the far side of the boundary).

⚠️ THE BOARD SOCKET IS `openers.mjs`'s `boardOn`, the shared one. No opener
in that file takes a WebMIDI device as a source (`keys` draws its own
keyboard), so the forwarding is here, and it is the next thing to lift.
⚠️ UNDER THE HARNESS A BOARD LINK OPENS ONLY AGAINST A STAND-IN: a `?relay=`
on this machine (`wire.mjs` `relayOverride`), and `board.mjs` still refuses
to send anything unless the run also says `board=1`.

<a id="open-board-channel"></a>

## midi-node.mjs, `openBoard`, onto the instrument's channel

⚠️ ONTO THE INSTRUMENT'S OWN CHANNEL, as `openers.mjs`'s `keys` does: the
MK-425C plays on channel 2 and the board's gate takes only the channels
its port names, so a link that passed channels through would be a link
the Circuit refused note by note.

<a id="circuit-in"></a>

## midi-node.mjs, `CIRCUIT_IN` and `STAND_IN_BOARD`

The board's graph as `demo/fake-board.mjs` announces it, typed from that file's own config.
The Circuit's MIDI in on the Pi, `pi-1:circuit:midi-in` since 2026-10-10.

<a id="check-own-node"></a>

## midi-node.mjs, `checkMidiNode`, the page's own node

🔴 THE PAGE'S OWN NODE, which reads state and opens nothing.

<a id="check-scratch"></a>

## midi-node.mjs, `checkMidiNode`, a scratch node

🔴 A SCRATCH NODE, built the same way, on a relay that lives in this file.
A stand-in patchbay hears it, asks for links and gets this page's answers.

<a id="check-board-link"></a>

## midi-node.mjs, `checkMidiNode`, evo out to the Circuit

🔴 THE PLAN'S FIRST DEMO, `evo:out -> pi-1:circuit:midi-in`. The board's
graph is the stand-in's own, as `fake-board.mjs` builds it; under a plain
harness run the link is refused, and with a stand-in on this machine
(`?relay=` local, and `board=1` so the board module may send) it is opened
for real and the board counts what it wrote.

<a id="check-waits"></a>

## midi-node.mjs, `checkMidiNode`, waits under 1.6 s

⚠️ EVERY WAIT HERE IS UNDER 1.6 s AND ENDS IN AN ASSERT. `verify.mjs`
stops collecting after 2 s with no new assert, so a longer wait that
fails does not go red, it drops every assert after it while the run
stays green. MEASURED: a forwarding sabotaged to send nothing read
77/77 with three asserts missing, when the waits here were 6 s.
