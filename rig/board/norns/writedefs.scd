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
            // The rung, from the engine that just built itself — never from the
            // environment read a second time. ⚠️ `PAPPUS READY` prints
            // `lite=true` on TINY as well, so `lite` alone cannot name a rung.
            rung = if(e.bare) { "bare" } { if(e.tiny) { "tiny" } { if(e.lite) { "lite" } { "full" } } };
            def = SynthDescLib.global[\pappus].def;
            if(def.isNil) { "NO pappus IN LIB".postln; 1.exit };
            ~write.value("pappus-" ++ rung ++ ".scsyndef", def.asBytes);

            // The material. It is a plain SynthDef with no server dependency,
            // but it is built HERE so both files come out of one sclang in one
            // sitting — two runs is two chances for the board to have changed
            // underneath them.
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
