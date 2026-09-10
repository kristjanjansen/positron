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

        Routine({
            1.0.wait;
            // Enough to make it audible with nothing plugged in: pick one of the
            // shipped loops as the grain source, open the gate pattern, run.
            e.cmd(\msrc, 1);
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
