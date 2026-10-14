# Kit lessons: midi-graph.mjs, midi-graph-test.mjs

The long comments cut from `demo/shell/midi-graph.mjs` and `demo/shell/midi-graph-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-midi-graph.md#<anchor>`.

<a id="header"></a>

## midi-graph.mjs, file header

demo/shell/midi-graph.mjs: this browser's WebMIDI ports as bay device nodes
with ids that survive a replug, a graph a page can announce, and links
between local ports run through `route-core.mjs`.

Step 3 of `plans/plan-routing-migration.md` §4, for the gap its §3.1 names:
`/patchbay/` announces three ports of its own and none of the MIDI devices
plugged into the machine it runs on, and eight of the eleven pages that
should move are WebMIDI pages.

🔴 A PORT IS KEYED BY IDENTITY, NEVER BY NAME. CoreMIDI renames a held port
`Circuit` to `Circuit 2` when it is replugged (plan-patchbay §2.3), so a
name is a label that is allowed to change. Identity follows route-core §3,
which is RaspiMIDIHub's `device_id.py` (plan-wish-dawless §12), in order:
  1. a serial, refusing placeholders (a Digitone II ships `000000000001`);
  2. the port path, which in a browser is the `MIDIPort.id` the browser
     hands over, unless both sides carry real serials and they differ;
  3. a soft match on manufacturer, direction and the name with its trailing
     numbers taken off, ONLY when exactly one remembered port that is not
     present meets exactly one new port. Two identical units are never
     guessed between: the second one gets a node of its own, `circuit-2`.
⚠️ WebMIDI EXPOSES NO SERIAL. Step 1 reads `serialOf(port)`, which is
`port.serial` when something put one there and nothing otherwise, so in an
ordinary browser identity starts at step 2. It is kept so a page that knows
more (a profile, WebUSB) can say so, and so the rule reads the same here as
on the Pi and the Pico.
⚠️ WHETHER A BROWSER'S `MIDIPort.id` SURVIVES A REPLUG IS NOT MEASURED HERE.
How each browser derives it was not checked; if it changes, step 3 is what
keeps the id, and the test drives both cases.

⚠️ A VISIT OPENS NOTHING. Importing this file and calling `createMidiGraph`
asks for nothing: MIDI access is requested by `start()`, which a page calls
from a press, or handed over with `attach(access)` by a page that opened
MIDI itself. An input gets a listener only while a link starts at it.

⚠️ IT DOES NOT JOIN A ROOM. It takes a plain `announce(graph)` callback, so
a page wires it to whatever join helper it uses, and it never sends a graph
that has not changed (a registry that hears *changed* every beat redraws on
every beat). `announce()` with no argument sends it again, which is the
answer to `graph.ask`.

Directions, because the two layers count them from opposite ends:
  WebMIDI input  (the device sends to us)  bay `site:node:out`, dir 'out',
                                           route-core dir 'in'
  WebMIDI output (we send to the device)   bay `site:node:in`,  dir 'in',
                                           route-core dir 'out'

<a id="slug-for"></a>

## midi-graph.mjs, slugFor()

A node slug for a new port: the node of its other half when exactly one is
waiting, else a fresh one. ⚠️ THE NAME PAIRS TWO HALVES SEEN AT ONE
MOMENT AND NEVER CARRIES AN ID ACROSS TIME. An input and an output called
`Circuit 2` by one manufacturer are one device now, which is what CoreMIDI
shows; two halves that could both be its partner are not chosen between.

<a id="test-header"></a>

## midi-graph-test.mjs, file header

demo/shell/midi-graph-test.mjs: this browser's MIDI ports as nodes with ids
that survive a replug, with a fake MIDIAccess, no browser and no device.

  node demo/shell/midi-graph-test.mjs

Step 3 of `plans/plan-routing-migration.md` §4. The fake is the shape the
module reads off WebMIDI and nothing more: `inputs` and `outputs` as maps of
ports carrying `id`, `name`, `manufacturer`, `state`, `send`, `open` and
`midimessage` listeners, and a `statechange` on the access.

⚠️ WHAT IS NOT GRADED HERE. Whether a real browser keeps `MIDIPort.id` across
a replug, and whether CoreMIDI's rename is ` 2` on every macOS, are facts
about a browser and an OS; both paths are driven here (the id kept, and the id
changed so only the soft match can keep the port), and neither is measured.
Nothing here sends a byte to an instrument.

MOST OF THESE ARE NEGATIVE CONTROLS, for the reason `bay-test.mjs` gives: a
resolver that hands back the remembered id whenever a name looks right passes
every positive replug check. Each one named NEGATIVE CONTROL has to see a
guess refused, a listener absent, a byte held or a graph not sent. The count
is printed at the end: 28 of 60.

🔴 PROVED BY BREAKING `midi-graph.mjs` ON A SCRATCH COPY, ONE FAULT AT A
TIME, against 60 green (2026-10-06):

  sabotage                                              red
  the soft match takes the first of several             3 of 60
  the path step keyed by name                           4 of 60
  the path step ignores a disagreeing serial            1 of 60
  the soft match ignores a disagreeing serial           1 of 60
  the soft match ignores the manufacturer               1 of 60
  the soft match ignores the direction                  3 of 60
  placeholder serials taken as serials                  2 of 60
  two halves paired by stem when the names differ       1 of 60
  the graph sent on every scan                          3 of 60
  unlink releases nothing                               3 of 60
  every input listens, linked or not                    3 of 60
  MIDI asked for when the graph is created              2 of 60
  remembered absent ports left out of route-core        1 of 60

⚠️ TWO OF THESE WERE GREEN ON THE FIRST RUN AND WERE HOLES IN THE TEST, NOT
IN THE MODULE: the serial guard on the path step (every serial case was
settled at step 1 before the path was read) and pairing by stem (every
output in the test had an input of its own name). Both have asserts now.
