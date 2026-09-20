// Pappus as a service: instantiate it, make it audible, and leave an OSC door
// open so the board can drive any of its 107 commands from node.
s.options.numOutputBusChannels = 2;
s.options.numInputBusChannels  = 2;
s.options.sampleRate = 48000;
s.options.memSize = 65536;          // granular + 48 resonators wants headroom
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
s.options.numWireBufs = 128;
s.waitForBoot({
    var ctx = (
        server: s,
        xg:     Group.new(s),
        // Engine_Pappus.sc:1757 — in_b is an ARRAY, out_b is a SINGLE bus.
        //
        // ⚠️ in_b must be the HARDWARE inputs, not private busses. Pappus
        // granulates `In.ar(inbusl)`, so private busses mean it granulates
        // silence — which is exactly what it did: loaded, ran, made nothing.
        // On scsynth the hardware inputs begin at numOutputBusChannels.
        in_b:  [Bus.new(\audio, s.options.numOutputBusChannels,     1, s),
                Bus.new(\audio, s.options.numOutputBusChannels + 1, 1, s)],
        out_b: Bus.new(\audio, 0, 2, s)
    );
    ~eng = Engine_Pappus.new(ctx, { arg e;
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

        // Any command, by name, from outside: /pappus/cmd <name> <args...>
        OSCdef(\pcmd, { arg msg;
            var name = msg[1].asString.asSymbol;
            e.cmd(name, *msg[2..]);
        }, '/pappus/cmd');

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
        PosSource.add;
        ~posSynth = nil;
        // 🔴 TWO WAVETABLES, AND THE ONE NOT PLAYING IS THE ONE THAT GETS
        // WRITTEN. `Osc.ar` reads a buffer every sample, so filling the buffer
        // it is currently reading is a step in the middle of a waveform — a
        // click, written into a granulator's ring buffer, re-fired by every
        // grain that later reads that spot. `~posXf` is which one the synth is
        // crossfaded to, so the fill always lands on the other.
        ~posBufs = [Buffer.alloc(s, PosSource.tableSize, 1),
                    Buffer.alloc(s, PosSource.tableSize, 1)];
        ~posXf = 0;
        // ⚠️ ONE PORT, DECIDED HERE AND NOWHERE ELSE — and ONE NetAddr, for the
        // same reason one line down. The board binds it; see `pappus.mjs`. The
        // grain shipper below sends on this too rather than building a second
        // address to the same place, because a port number written twice in one
        // file disagrees with itself the first time either copy moves.
        ~boxOut = NetAddr("127.0.0.1", 57321);
        OSCdef(\poson, { arg msg;
            var want = msg[1] > 0;
            if(want) {
                if(~posSynth.isNil) {
                    ~posSynth = Synth(\posSource, [
                        \out, ctx.in_b[0].index,
                        \b0, ~posBufs[0].bufnum, \b1, ~posBufs[1].bufnum,
                        \xf, ~posXf
                    ], ctx.xg, \addToHead);
                    ("POSSOURCE ON node " ++ ~posSynth.nodeID
                        ++ " -> bus " ++ ctx.in_b[0].index
                        ++ " tables " ++ ~posBufs[0].bufnum ++ "/" ++ ~posBufs[1].bufnum).postln;
                };
            } {
                if(~posSynth.notNil) {
                    // Released, not freed: the envelope's own doneAction frees
                    // it once the release has run, so the granulator is never
                    // handed a step in the middle of a grain.
                    ~posSynth.set(\gate, 0);
                    "POSSOURCE OFF".postln;
                    ~posSynth = nil;
                };
                ~boxOut.sendMsg('/possrc', 0, -1, -1, -1);
            };
        }, '/pos/on');
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
        OSCdef(\postable, { arg msg;
            var amps = msg[1..].asArray;
            Routine({
                var next = 1 - ~posXf;
                ~posBufs[next].sine1(amps, false, true, true);
                s.sync;
                ~posXf = next;
                if(~posSynth.notNil) { ~posSynth.set(\xf, ~posXf) };
                ("POSSOURCE TABLE " ++ amps.size ++ " partials -> buffer "
                    ++ ~posBufs[next].bufnum).postln;
            }).play;
        }, '/pos/table');
        // Scalars and arrays take different OSC doors, because `n_set` and
        // `n_setn` are different messages and guessing which one a value wants
        // from its arity is how a one-element array becomes a scalar.
        OSCdef(\posset, { arg msg;
            if(~posSynth.notNil) { ~posSynth.set(msg[1].asString.asSymbol, msg[2]) };
        }, '/pos/set');
        OSCdef(\possetn, { arg msg;
            if(~posSynth.notNil) { ~posSynth.setn(msg[1].asString.asSymbol, msg[2..]) };
        }, '/pos/setn');
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
        OSCdef(\posconfirm, { arg msg;
            Routine({
                if(~posSynth.isNil) {
                    ~boxOut.sendMsg('/possrc', 0, -1, -1, -1);
                } {
                    s.sync;
                    ~posSynth.get(\nvoices, { arg nv;
                        ~posSynth.get(\hz, { arg f;
                            ~boxOut.sendMsg('/possrc', 1, ~posSynth.nodeID, nv, f);
                        });
                    });
                };
            }).play;
        }, '/pos/confirm');

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
        ~grainBuf = List.new;
        ~grainSeen = 0;
        ~grainCap = 120;
        ~grainFirst = true;
        OSCdef(\pgrain, { arg msg;
            // msg: [/pgrain, nodeID, replyID, pos, dur, voice, half]
            // ONE LINE, ONCE. It is the only proof in the log that the
            // reports are arriving at all, and the failure it catches is
            // silent in both directions: a wrong OSC address gives an OSCdef
            // that never fires, and an unregistered command gives a `report`
            // that is never set. Both read as "this granulator fires no
            // grains" about one firing hundreds a second.
            if (~grainFirst) { ~grainFirst = false; ("PGRAIN FIRST " ++ msg).postln; };
            ~grainSeen = ~grainSeen + 1;
            if (~grainBuf.size < ~grainCap) {
                ~grainBuf.add(msg[3]); ~grainBuf.add(msg[6]);
            };
            // ⚠️ '/pgrain', NOT '/reply'. `SendReply`'s cmdName IS the OSC
            // address it sends on — '/reply' is only its DEFAULT. Listening on
            // the default while the engine sends '/pgrain' is a handler that
            // never fires, with nothing anywhere saying so: the grains would
            // arrive at sclang and be dropped on the floor, and the far end
            // would read "this granulator fires no grains" about one that is
            // firing hundreds a second.
        }, '/pgrain');

        Routine({
            loop {
                0.25.wait;
                if (~grainSeen > 0) {
                    ~boxOut.sendMsg('/pgrain', ~grainSeen, *~grainBuf.asArray);
                    ~grainBuf = List.new;
                    ~grainSeen = 0;
                };
            };
        }).play;

        Routine({
            1.0.wait;
            // Enough to make it audible with nothing plugged in: pick one of the
            // shipped loops as the grain source, open the gate pattern, run.
            // 🔴 BOTH GRANULATORS RECORD. This read `msrc 1` — which is OFF —
            // so granulator ONE never captured the instrument at all, for the
            // life of this file. The source table is 1 OFF, 2 STEREO, 3 MONO L,
            // 4 MONO R; there is no 0, and 1 does not merely pause the write,
            // it erases (see pappus.mjs, LESSONS #46). So half of a two-half
            // granulator has been playing an empty buffer while `grains` drew
            // nine numbers for it and a slider moved them.
            e.cmd(\msrc, 2);
            e.cmd(\nsrc, 2);
            e.cmd(\amp, 1.0);
            e.cmd(\mswarm, 0.6);
            e.cmd(\nswarm, 0.4);
            e.cmd(\mrate, 0.5);
            e.cmd(\ingain, 1.0);
            e.cmd(\run, 1);
            "PAPPUS RUNNING".postln;
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
            ("PAPPUS READY " ++ e.listCommands.size ++ " commands, rung="
                ++ if(e.bare) { "BARE" } { if(e.tiny) { "TINY" } { if(e.lite) { "LITE" } { "FULL" } } }
                ++ " lite=" ++ e.lite ++ " tiny=" ++ e.tiny ++ " bare=" ++ e.bare).postln;
        }).play;
    });
});
