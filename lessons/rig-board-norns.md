# rig-board-norns

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `rig/board/norns/CroneEngine.sc`

### crone-header

Above `CroneEngine {`, lines 1 to 15 before the cut.

~~~supercollider
// CroneEngine.sc — a stand-in for norns' engine base class.
//
// A norns "engine" is an ordinary SuperCollider class that inherits from
// CroneEngine and registers commands; the rest of norns — the Lua layer, the
// grid, softcut — is not involved in making the sound. So an engine runs on
// plain scsynth given four things, which is all this file provides:
//
//   *new(context, doneCallback)   the constructor shape engines expect
//   alloc                          called once, inside a Routine so that
//                                  server.sync inside it works
//   addCommand / addPoll           registration, kept in a dictionary
//   free                           teardown
//
// Engine_Pappus touches exactly four members of the audio context —
// server, in_b, out_b, xg — so the context can be a plain Event.
~~~

### crone-routine

Above `Routine({`, lines 29 to 31 before the cut.

~~~supercollider
// norns runs alloc inside a Routine and only fires doneCallback once
// it returns. Engines rely on that — Pappus calls server.sync in
// prAlloc, which needs a thread.
~~~

### crone-cmd

Above `cmd { arg name ... args;`, lines 51 to 59 before the cut.

~~~supercollider
// Not part of norns' interface — this is how a caller without Lua invokes
// a registered command.
//
// ⚠️ The handler is given an ARRAY, and its first argument is msg[1], not
// msg[0] — norns passes the OSC message with the command name still in
// slot 0. Engines are written against that: Pappus does
//     addCommand("amp", "f", { arg msg; synth.set(\amp, msg[1]) })
// so passing the arguments directly gets `Message 'at' not understood` on
// an Integer. Rebuild the shape norns would have sent.
~~~

## `rig/board/norns/poscollide-defs.scd`

### poscollide-defs

Above `(`, lines 1 to 19 before the cut.

~~~supercollider
// rig/board/norns/poscollide-defs.scd: the board's limiter for page programs.
//
// `rig/board/scollide.mjs` runs this with sclang only when the .scsyndef file
// is missing or older than this file, then loads it into whichever scsynth the
// collide engine plays on (its own on 57131, or the sampler's on 57130).
//
// Every program a page sends is compiled to write to a PRIVATE bus pair
// (`PAGE_BUS`, 64 and 65), never to the outputs. This one def, added after the
// page group, reads that pair, limits each side to `level` and writes the
// result to the outputs. So a page cannot be louder than `level` per channel,
// and on a shared server the piano, which writes to the outputs directly, never
// passes through it.
//
// `fold` is 0.5 because the capture SUMS out_1 and out_2 into one JACK input
// while a page's analyser and speakers AVERAGE stereo to mono, so the same note
// reads the same level in the tab and from the Pi. `level` is per channel after
// the fold (0.49, so the capture tops out at 0.98): a guard against the s16
// capture clipping, not a loudness cap. Both are sent by `scollide.mjs`
// (`FOLD`, `LIMIT_LEVEL`), which says what was measured, 2026-10-12.
~~~

## `rig/board/norns/possampler-defs.scd`

### possampler-defs

Above `(`, lines 1 to 23 before the cut.

~~~supercollider
// rig/board/norns/possampler-defs.scd: the board sampler's two SynthDefs,
// written to disk once and loaded by a scsynth that no sclang ever talks to.
//
// `rig/board/scsampler.mjs` runs this with sclang only when the .scsyndef files
// are missing or older than this file, then drives scsynth over OSC itself:
// voices, stealing, the pedal and program change all live in node, so there is
// no second sclang running beside the granulator's.
//
// One voice is one recording played at a rate, shaped by a gate:
//   - `rate` is 2^(shift/12) for a key up to one semitone (piano) or three
//     (Rhodes) from its recording, times BufRateScale so a 44.1 kHz file plays
//     at its own pitch on a 48 kHz server;
//   - the attack is 1 ms, which only stops a click: a struck string has no
//     attack to shape, and the browser's sampler has none at all;
//   - gate 0 is the damper, a ramp over `rel` seconds (pedal.mjs `damperSec`,
//     0.12 s for an ordinary key up), set in the same message as the gate;
//   - the voice frees itself when the gate's ramp ends OR the recording runs
//     out, whichever is first, so a note held past its file costs nothing.
//
// Two defs because a PlayBuf's channel count is fixed when the def is built:
// the piano FLACs are stereo and the Rhodes FLACs are mono. A mono voice writes
// out_1 only; the board's capture sums out_1 and out_2, so a mono voice is not
// doubled.
~~~

## `rig/board/norns/run-pappus.scd`

### wire-bufs

Above `s.options.numWireBufs = 128;`, lines 7 to 21 before the cut.

~~~supercollider
// 🔴 AUDIO INTERCONNECT BUFFERS, AND THE DEFAULT IS 64. norns/README.md already
// names this as the constraint Pappus sits close to, and adding a second synth
// to the same server found the edge on the first run: `PosSource` failed to load
// with `exception in GraphDef_Load: exceeded number of interconnect buffers`,
// scsynth answered `SynthDef posSource not found` to every `/s_new` afterwards,
// and the only symptom a page could see was silence.
//
// ⚠️ RAISING IT TO 128 DID NOT FIX THAT, AND THE LINE STAYS ANYWAY. Measured:
// the same failure at 64 and at 128, because the def held every partial live at
// once (1,151 UGens) and the wires scaled with the table. The fix was to stop
// building it that way — `PosSource.sc` plays a wavetable now — so this is
// headroom for a graph that was already near a documented edge, not a repair.
// Saying which is the difference between a line somebody can remove and a line
// nobody dares to. It is a SERVER option: it needs scsynth rebooted, not
// anything recompiled, and it costs 512 KB at this block size.
~~~

### in-b

Above `in_b:  [Bus.new(\audio, s.options.numOutputBusChannels,     1, s),`, lines 27 to 32 before the cut.

~~~supercollider
// Engine_Pappus.sc:1757 — in_b is an ARRAY, out_b is a SINGLE bus.
//
// ⚠️ in_b must be the HARDWARE inputs, not private busses. Pappus
// granulates `In.ar(inbusl)`, so private busses mean it granulates
// silence — which is exactly what it did: loaded, ran, made nothing.
// On scsynth the hardware inputs begin at numOutputBusChannels.
~~~

### ready-last

Above `// Any command, by name, from outside: /pappus/cmd <name> <args...>`, lines 38 to 52 before the cut.

~~~supercollider
// 🔴 `PAPPUS READY` IS PRINTED AT THE BOTTOM OF THIS BLOCK, NOT HERE,
// AND MOVING IT FIXED A RACE THAT ONLY BIT A COLD BOARD. `pappusFx`
// waits for that exact line and answers `ok` on it, so a page acts the
// instant it appears — and the startup Routine below then waited a
// second and set `mrate 0.5`, `msrc 2`, `amp`, `ingain` and `run` OVER
// whatever the page had just sent. MEASURED: `grains` asked for 2.2
// grains a second on a cold board and the engine reported 0.5, which is
// this file's own default arriving late. On a warm board the Routine had
// long since run and the same page read 2.1 and 2.3 — so it failed only
// on the first visit after a restart, which is the visit nobody is
// watching.
//
// Everything below is registered SYNCHRONOUSLY, so the commands and the
// OSC doors all exist before the line goes out; only the announcement
// moves.
~~~

### pos-source

Above `PosSource.add;`, lines 60 to 76 before the cut.

~~~supercollider
// ── THE MATERIAL, MADE HERE RATHER THAN ARRIVING ─────────────────
//
// 🔴 `grains` puts this granulator beside one in a browser and the
// biggest difference between them is not the granulator, it is what
// each one is chewing (plan-twins §4a). `PosSource` is one description
// of a sound rendered at both ends: the page expands a spec into a
// table of sine partials with `demo/shell/source.mjs`, and the board
// sends that SAME table here.
//
// ⚠️ IT WRITES TO PAPPUS'S OWN INPUT BUS, so there is no JACK re-patch
// of SuperCollider at all — and a re-patch is what made `fx.pappus`
// answer `ok` seven seconds before anything could be heard.
//
// ⚠️ `addToHead`. `Out.ar` SUMS into a bus and scsynth runs nodes in
// order; Engine_Pappus adds its synth `addToTail`, so a source at the
// tail would write the bus one block AFTER the granulator read it —
// silence, for ever, with nothing anywhere saying so.
~~~

### pos-bufs

Above `~posBufs = [Buffer.alloc(s, PosSource.tableSize, 1),`, lines 79 to 84 before the cut.

~~~supercollider
// 🔴 TWO WAVETABLES, AND THE ONE NOT PLAYING IS THE ONE THAT GETS
// WRITTEN. `Osc.ar` reads a buffer every sample, so filling the buffer
// it is currently reading is a step in the middle of a waveform — a
// click, written into a granulator's ring buffer, re-fired by every
// grain that later reads that spot. `~posXf` is which one the synth is
// crossfaded to, so the fill always lands on the other.
~~~

### box-out

Above `~boxOut = NetAddr("127.0.0.1", 57321);`, lines 88 to 92 before the cut.

~~~supercollider
// ⚠️ ONE PORT, DECIDED HERE AND NOWHERE ELSE — and ONE NetAddr, for the
// same reason one line down. The board binds it; see `pappus.mjs`. The
// grain shipper below sends on this too rather than building a second
// address to the same place, because a port number written twice in one
// file disagrees with itself the first time either copy moves.
~~~

### postable

Above `OSCdef(\postable, { arg msg;`, lines 119 to 131 before the cut.

~~~supercollider
// The amplitude table, as `partialsOf` finished it: one value per
// partial, in order, harmonic 1 first.
//
// ⚠️ `normalize` IS THE SECOND ARGUMENT AND IT DEFAULTS TO TRUE. Left
// alone it rescales the table to full amplitude, which would throw the
// spec's `level` away while everything still made a sound — the worst
// shape of wrong, because the page and the board would then be at two
// different levels with two matching readouts.
//
// ⚠️ AND `s.sync` BETWEEN THE FILL AND THE FADE. `/b_gen` is
// asynchronous; moving the crossfade first would fade to a table that
// has not been written yet, which is silence for as long as the server
// takes and reads as a spec that did not arrive.
~~~

### posconfirm

Above `OSCdef(\posconfirm, { arg msg;`, lines 153 to 164 before the cut.

~~~supercollider
// 🔴 THE SERVER ANSWERS, NOT THE CLIENT — AND THE FIRST VERSION OF THIS
// GOT IT WRONG IN THE MOST EXPENSIVE WAY. It sent back
// `~posSynth.nodeID` as proof the synth existed. `Synth.new` allocates
// an id on the CLIENT and returns before the server has read the
// message, so it answered `node 1002` about a def that had failed to
// load, and the board reported `engineOn: true` about a silent graph.
//
// `/s_get` is a QUESTION TO scsynth: it replies only if that node is
// really there, with the value the control really holds. So this is
// asked AFTER the table and the scalars have been written, and what
// comes back is evidence that all of it landed — which is the difference
// between "the board sent it" and "the engine has it".
~~~

### grain-buf

Above `~grainBuf = List.new;`, lines 180 to 197 before the cut.

~~~supercollider
// 🔴 EVERY GRAIN, FORWARDED TO THE BOARD — and BATCHED HERE, at the only
// place that can see them all.
//
// The engine's `report` control fires a `/pgrain` for each grain as
// `GrainBuf` is triggered, carrying the read position as a fraction of
// the whole buffer. Sixteen voices at up to 24 grains a second is ~380
// messages a second, and the relay that eventually carries these to a
// page is MEASURED to drop everything past 60 msg/s WITHOUT TELLING
// THE SENDER — so one datagram per grain would arrive as a sparse
// cloud that looks like a quiet granulator rather than like a dropped
// message.
//
// So they are accumulated and shipped in one datagram every 250 ms:
// four messages a second whatever the grain rate, and the count of
// grains in the window travels with them so the far end can tell
// "few grains" from "few messages". ⚠️ The CAP matters for the same
// reason — a window is truncated rather than allowed to grow without
// limit, and the honest count goes out beside the truncated list.
~~~

### pgrain-first

Above `if (~grainFirst) { ~grainFirst = false; ("PGRAIN FIRST " ++ msg).postln; };`, lines 203 to 209 before the cut.

~~~supercollider
// msg: [/pgrain, nodeID, replyID, pos, dur, voice, half]
// ONE LINE, ONCE. It is the only proof in the log that the
// reports are arriving at all, and the failure it catches is
// silent in both directions: a wrong OSC address gives an OSCdef
// that never fires, and an unregistered command gives a `report`
// that is never set. Both read as "this granulator fires no
// grains" about one firing hundreds a second.
~~~

### pgrain-address

Above `}, '/pgrain');`, lines 215 to 221 before the cut.

~~~supercollider
// ⚠️ '/pgrain', NOT '/reply'. `SendReply`'s cmdName IS the OSC
// address it sends on — '/reply' is only its DEFAULT. Listening on
// the default while the engine sends '/pgrain' is a handler that
// never fires, with nothing anywhere saying so: the grains would
// arrive at sclang and be dropped on the floor, and the far end
// would read "this granulator fires no grains" about one that is
// firing hundreds a second.
~~~

### msrc

Above `e.cmd(\msrc, 2);`, lines 237 to 245 before the cut.

~~~supercollider
// Enough to make it audible with nothing plugged in: pick one of the
// shipped loops as the grain source, open the gate pattern, run.
// 🔴 BOTH GRANULATORS RECORD. This read `msrc 1` — which is OFF —
// so granulator ONE never captured the instrument at all, for the
// life of this file. The source table is 1 OFF, 2 STEREO, 3 MONO L,
// 4 MONO R; there is no 0, and 1 does not merely pause the write,
// it erases (see pappus.mjs, LESSONS #46). So half of a two-half
// granulator has been playing an empty buffer while `grains` drew
// nine numbers for it and a slider moved them.
~~~

### ready-line

Above `("PAPPUS READY " ++ e.listCommands.size ++ " commands, rung="`, lines 255 to 271 before the cut.

~~~supercollider
// ⚠️ LAST, AND THAT IS THE POINT. Nothing this file sets can land on
// top of a client's settings any more, because no client has been
// told it may start yet.
// 🔴 THIS LINE SAID `lite=true` ON A TINY BOARD, AND IT COST A DAY.
// `if(tiny) { lite = true }` in the engine, so `lite` is true on
// three of the four rungs and NAMES none of them — while this is the
// line anybody actually reads, because it is the last one and the
// one that says READY. `Engine_Pappus: TINY graph` prints 7 seconds
// earlier and scrolls away. MEASURED consequence, 2026-09-14: the
// board had been on TINY since 22:47 the night before and the
// session record, the handoff queue and a commit message all said it
// was on LITE — carried as "the top board-side open item".
// ⚠️ `TINY.md` and `CHAIN.md` had both already WARNED that this line
// cannot tell the rungs apart, and `writedefs.scd` already printed
// it correctly. A warning about a misleading readout is not a fix;
// the readout is the fix. All three flags, like writedefs does,
// because a rung name alone cannot show a flag that failed to take.
~~~

## `rig/board/norns/writedefs.scd`

### writedefs-header

Above `~dir = "PAPPUS_OUT".getenv ? "/tmp";`, lines 1 to 33 before the cut.

~~~supercollider
// writedefs.scd — compile the two definitions `/grains/` ships to the browser,
// on the board, with the board's own sclang, and write them where nothing
// deletes them.
//
//   PAPPUS_TINY=1 PAPPUS_OUT=/tmp/defs sclang -u 57125 writedefs.scd
//
// It writes `<PAPPUS_OUT>/pappus-<rung>.scsyndef` and
// `<PAPPUS_OUT>/possource.scsyndef`, and posts the byte count of each.
//
// 🔴 WHY THE BOARD AND NOT A LAPTOP. `/grains/` claims the SAME graph runs in
// the browser and on the Pi. That claim is only true if the bytes the page
// loads came out of the same `Engine_Pappus.sc` the service compiles, so the
// definition is a build artefact OF THIS BOARD and is produced here.
// `workers/view/build.mjs` refuses the build when the recorded source hash and
// the file on disk disagree, which is what stops a stale artefact shipping.
//
// 🔴 IT DOES NOT TOUCH THE RUNNING SERVICE, and that is checked rather than
// assumed. A SECOND scsynth on its own UDP port, its own buffers and its own
// JACK client. It is deliberately NOT `run-pappus.scd` with a line added —
// that file opens a `/pappus/cmd` door and posts `/pgrain` into the live board's
// own socket, so running it twice would have two engines answering one page.
//
// ⚠️ sclang `File.delete`s the definition it sends (`SynthDef.sc` `doSend`,
// the `/d_load` branch), which is why `~/.local/share/SuperCollider/synthdefs/`
// always reads empty and why an earlier capture had to RACE a recompile. There
// is no need to race it: `.add` calls `asSynthDesc(libname, keepDef: true)`, so
// the SynthDef OBJECT stays in the library and `.def.asBytes` hands over the
// same bytes with nothing deleting anything.
//
// ⚠️ The rung is whatever the environment says, exactly as the service reads it
// — `PAPPUS_TINY` and `PAPPUS_BARE` by PRESENCE, `PAPPUS_LITE` by value. Run it
// with the same variables `/etc/default/positron-board` carries, or the file you
// ship is a different instrument from the one the board is playing.
~~~

### writedefs-rung

Above `rung = if(e.bare) { "bare" } { if(e.tiny) { "tiny" } { if(e.lite) { "lite" } { "`..., lines 65 to 67 before the cut.

~~~supercollider
// The rung, from the engine that just built itself — never from the
// environment read a second time. ⚠️ `PAPPUS READY` prints
// `lite=true` on TINY as well, so `lite` alone cannot name a rung.
~~~

### writedefs-source

Above `PosSource.add;`, lines 73 to 76 before the cut.

~~~supercollider
// The material. It is a plain SynthDef with no server dependency,
// but it is built HERE so both files come out of one sclang in one
// sitting — two runs is two chances for the board to have changed
// underneath them.
~~~
