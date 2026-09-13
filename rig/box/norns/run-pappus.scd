// Pappus as a service: instantiate it, make it audible, and leave an OSC door
// open so the box can drive any of its 107 commands from node.
s.options.numOutputBusChannels = 2;
s.options.numInputBusChannels  = 2;
s.options.sampleRate = 48000;
s.options.memSize = 65536;          // granular + 48 resonators wants headroom
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
        ("PAPPUS READY " ++ e.listCommands.size ++ " commands, lite=" ++ e.lite).postln;

        // Any command, by name, from outside: /pappus/cmd <name> <args...>
        OSCdef(\pcmd, { arg msg;
            var name = msg[1].asString.asSymbol;
            e.cmd(name, *msg[2..]);
        }, '/pappus/cmd');

        // 🔴 EVERY GRAIN, FORWARDED TO THE BOX — and BATCHED HERE, at the only
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

        // ⚠️ ONE PORT, DECIDED HERE AND NOWHERE ELSE. The box listens on it;
        // see `pappus.mjs`. A port number typed in two files is a port number
        // that disagrees with itself the first time either moves.
        ~grainOut = NetAddr("127.0.0.1", 57321);
        Routine({
            loop {
                0.25.wait;
                if (~grainSeen > 0) {
                    ~grainOut.sendMsg('/pgrain', ~grainSeen, *~grainBuf.asArray);
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
        }).play;
    });
});
