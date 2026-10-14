// Pappus as a service: instantiate it, make it audible, and leave an OSC door
// open so the board can drive any of its 107 commands from node.
s.options.numOutputBusChannels = 2;
s.options.numInputBusChannels  = 2;
s.options.sampleRate = 48000;
s.options.memSize = 65536;          // granular + 48 resonators wants headroom
// 128 interconnect buffers (default 64): headroom near a documented edge, not a fix (PosSource now
// plays a wavetable). A server option, needing a scsynth reboot; 512 KB at this block size.
// why: lessons/rig-board-norns.md#wire-bufs
s.options.numWireBufs = 128;
s.waitForBoot({
    var ctx = (
        server: s,
        xg:     Group.new(s),
        // in_b is an array of hardware inputs (they start at numOutputBusChannels); out_b is one
        // bus.
        // Private busses would have Pappus granulate silence.
        // why: lessons/rig-board-norns.md#in-b
        in_b:  [Bus.new(\audio, s.options.numOutputBusChannels,     1, s),
                Bus.new(\audio, s.options.numOutputBusChannels + 1, 1, s)],
        out_b: Bus.new(\audio, 0, 2, s)
    );
    ~eng = Engine_Pappus.new(ctx, { arg e;
        // PAPPUS READY is printed at the bottom, after the startup settings: printed first, those
        // settings
        // landed over a client's on a cold board. Everything below registers synchronously.
        // why: lessons/rig-board-norns.md#ready-last

        // Any command, by name, from outside: /pappus/cmd <name> <args...>
        OSCdef(\pcmd, { arg msg;
            var name = msg[1].asString.asSymbol;
            e.cmd(name, *msg[2..]);
        }, '/pappus/cmd');

        // PosSource renders the page's own partial table here, writing Pappus's input bus (no JACK
        // re-patch).
        // `addToHead`, so it writes before the granulator (added at the tail) reads.
        // why: lessons/rig-board-norns.md#pos-source
        PosSource.add;
        ~posSynth = nil;
        // Two wavetables: the one not playing is written, then crossfaded to, so no click enters
        // the ring.
        // why: lessons/rig-board-norns.md#pos-bufs
        ~posBufs = [Buffer.alloc(s, PosSource.tableSize, 1),
                    Buffer.alloc(s, PosSource.tableSize, 1)];
        ~posXf = 0;
        // One port and one NetAddr to the board (pappus.mjs binds it), shared with the grain
        // shipper.
        // why: lessons/rig-board-norns.md#box-out
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
        // The amplitude table in partial order. `normalize` defaults to true and would drop the
        // spec's level,
        // so pass false; `s.sync` between the fill and the fade (/b_gen is asynchronous).
        // why: lessons/rig-board-norns.md#postable
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
        // Confirm with `/s_get`, which only a real node answers with its real values, after the
        // table and
        // scalars are written; a client-side node id is not evidence.
        // why: lessons/rig-board-norns.md#posconfirm
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

        // Grains batched here and sent every 250 ms with their count (the relay drops past its rate
        // silently),
        // capped per window with the honest count beside it.
        // why: lessons/rig-board-norns.md#grain-buf
        ~grainBuf = List.new;
        ~grainSeen = 0;
        ~grainCap = 120;
        ~grainFirst = true;
        OSCdef(\pgrain, { arg msg;
            // msg: [/pgrain, nodeID, replyID, pos, dur, voice, half]. One log line, once: proof
            // reports arrive.
            // why: lessons/rig-board-norns.md#pgrain-first
            if (~grainFirst) { ~grainFirst = false; ("PGRAIN FIRST " ++ msg).postln; };
            ~grainSeen = ~grainSeen + 1;
            if (~grainBuf.size < ~grainCap) {
                ~grainBuf.add(msg[3]); ~grainBuf.add(msg[6]);
            };
            // '/pgrain', not '/reply': SendReply's cmdName is the address it sends on.
            // why: lessons/rig-board-norns.md#pgrain-address
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
            // Audible with nothing plugged in: a shipped loop, the gate open, run. Both granulators
            // record
            // (msrc 2); 1 is OFF and erases.
            // why: lessons/rig-board-norns.md#msrc
            e.cmd(\msrc, 2);
            e.cmd(\nsrc, 2);
            e.cmd(\amp, 1.0);
            e.cmd(\mswarm, 0.6);
            e.cmd(\nswarm, 0.4);
            e.cmd(\mrate, 0.5);
            e.cmd(\ingain, 1.0);
            e.cmd(\run, 1);
            "PAPPUS RUNNING".postln;
            // Last, so nothing here lands over a client. The line names the rung and all three
            // flags (lite is true
            // on three of four rungs and named none, which cost a day).
            // why: lessons/rig-board-norns.md#ready-line
            ("PAPPUS READY " ++ e.listCommands.size ++ " commands, rung="
                ++ if(e.bare) { "BARE" } { if(e.tiny) { "TINY" } { if(e.lite) { "LITE" } { "FULL" } } }
                ++ " lite=" ++ e.lite ++ " tiny=" ++ e.tiny ++ " bare=" ++ e.bare).postln;
        }).play;
    });
});
