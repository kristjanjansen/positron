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
// `level` is `scsampler.mjs` LOUDEST / 2 per channel, because the capture sums
// out_1 and out_2 into one mono stream. INFERRED; step 4 of
// plans/plan-pi-supercollider-defs.md measures it in the capture.
(
var dir = "POS_DEFDIR".getenv ?? "/opt/positron-board/samples/defs";
File.mkdir(dir);
SynthDef(\posCollideOut, { |in = 64, level = 0.15|
	var sig = In.ar(in, 2);
	Out.ar(0, Limiter.ar(sig, level, 0.01));
}).writeDefFile(dir);
("POSCOLLIDE DEFS WRITTEN " ++ dir).postln;
0.exit;
)
