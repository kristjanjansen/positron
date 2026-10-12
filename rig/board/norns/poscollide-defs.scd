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
