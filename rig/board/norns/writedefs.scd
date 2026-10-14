// Compile pappus-<rung>.scsyndef and possource.scsyndef on the board, for `/grains/`. PAPPUS_TINY=1
// PAPPUS_OUT=/tmp/defs sclang -u 57125 writedefs.scd. A second scsynth, not the service. Run with
// the env of /etc/default/positron-board, or the defs are a different rung.
// why: lessons/rig-board-norns.md#writedefs-header

~dir = "PAPPUS_OUT".getenv ? "/tmp";
~srv = Server(\pdefwrite, NetAddr("127.0.0.1", 57112));
~srv.options.numOutputBusChannels = 2;
~srv.options.numInputBusChannels  = 2;
~srv.options.sampleRate = 48000;
~srv.options.memSize = 65536;
~srv.options.numWireBufs = 128;      // the board's own -w 128
~srv.options.maxLogins = 1;

~write = { arg name, bytes;
    var f = File(~dir ++ "/" ++ name, "wb");
    f.write(bytes);
    f.close;
    ("WROTE " ++ ~dir ++ "/" ++ name ++ " " ++ bytes.size ++ " bytes").postln;
};

~bail = Routine({ 240.wait; "TIMEOUT".postln; 1.exit; }).play(AppClock);

~srv.waitForBoot({
    var ctx = (
        server: ~srv,
        xg:     Group.new(~srv),
        in_b:  [Bus.new(\audio, ~srv.options.numOutputBusChannels,     1, ~srv),
                Bus.new(\audio, ~srv.options.numOutputBusChannels + 1, 1, ~srv)],
        out_b: Bus.new(\audio, 0, 2, ~srv)
    );
    ~eng = Engine_Pappus.new(ctx, { arg e;
        Routine({
            var rung, def;
            0.5.wait;
            // The rung from the built engine, not the env: PAPPUS READY prints lite=true on TINY
            // too.
            // why: lessons/rig-board-norns.md#writedefs-rung
            rung = if(e.bare) { "bare" } { if(e.tiny) { "tiny" } { if(e.lite) { "lite" } { "full" } } };
            def = SynthDescLib.global[\pappus].def;
            if(def.isNil) { "NO pappus IN LIB".postln; 1.exit };
            ~write.value("pappus-" ++ rung ++ ".scsyndef", def.asBytes);

            // Built in the same sclang run as Pappus, so both files come from one state of the
            // board.
            // why: lessons/rig-board-norns.md#writedefs-source
            PosSource.add;
            0.3.wait;
            def = SynthDescLib.global[\posSource].def;
            if(def.isNil) { "NO posSource IN LIB".postln; 1.exit };
            ~write.value("possource.scsyndef", def.asBytes);

            ("RUNG " ++ rung ++ " lite=" ++ e.lite ++ " tiny=" ++ e.tiny ++ " bare=" ++ e.bare).postln;
            0.5.wait;
            ~srv.quit;
            1.0.wait;
            0.exit;
        }).play(AppClock);
    });
});
