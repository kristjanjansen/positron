// Pappus on plain scsynth: no norns, no Lua, no grid.
s.options.numOutputBusChannels = 2;
s.options.numInputBusChannels = 2;
s.options.sampleRate = 48000;
s.options.memSize = 65536;          // granular + 48 resonators wants headroom
s.waitForBoot({
    var ctx, eng;
    // Engine_Pappus touches exactly four members of the norns audio context.
    ctx = (
        server: s,
        xg:     Group.new(s),
        // Read from the engine rather than guessed at (line 1757):
        //   context.in_b[0].index, context.in_b[1].index, context.out_b.index
        // so in_b is an ARRAY of busses and out_b is a SINGLE bus. They are not
        // the same shape, which is what two failed runs were telling me.
        in_b:  [Bus.audio(s, 1), Bus.audio(s, 1)],
        out_b: Bus.new(\audio, 0, 2, s)
    );
    "--- instantiating Engine_Pappus ---".postln;
    eng = Engine_Pappus.new(ctx, { arg e;
        ("--- ready. commands: " ++ e.listCommands.size ++ " ---").postln;
        ("--- lite mode: " ++ e.lite ++ " ---").postln;
        Routine({
            2.0.wait;
            "jack_connect SuperCollider:out_1 cap:input_1".unixCmd;
            1.5.wait;
            "--- driving it ---".postln;
            // open the gate and let the granulators run on the loaded loops
            ("commands (" ++ e.listCommands.size ++ "): ").postln;
            e.listCommands.do({ arg c, i; if(i < 40, { ("   " ++ c).postln }); });
            14.0.wait;
            "DONE".postln;
            0.exit;
        }).play;
    });
    30.0.wait;
    "TIMEOUT".postln;
    0.exit;
});
