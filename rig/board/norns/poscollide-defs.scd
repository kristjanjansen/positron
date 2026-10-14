// The limiter for page programs: reads PAGE_BUS (64, 65), limits each side to `level`, writes outs.
// `fold` 0.5 because the capture sums out_1 and out_2; scollide.mjs sends FOLD and LIMIT_LEVEL.
// why: lessons/rig-board-norns.md#poscollide-defs
(
var dir = "POS_DEFDIR".getenv ?? "/opt/positron-board/samples/defs";
File.mkdir(dir);
SynthDef(\posCollideOut, { |in = 64, fold = 0.5, level = 0.49|
	var sig = In.ar(in, 2);
	Out.ar(0, Limiter.ar(sig * fold, level, 0.01));
}).writeDefFile(dir);
("POSCOLLIDE DEFS WRITTEN " ++ dir).postln;
0.exit;
)
