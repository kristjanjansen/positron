// rig/board/norns/possampler-defs.scd: the board sampler's two SynthDefs,
// written to disk once and loaded by a scsynth that no sclang ever talks to.
//
// `rig/board/scsampler.mjs` runs this with sclang only when the .scsyndef files
// are missing or older than this file, then drives scsynth over OSC itself:
// voices, stealing, the pedal and program change all live in node, so there is
// no second sclang running beside the granulator's.
//
// One voice is one recording played at a rate, shaped by a gate:
//   - `rate` is 2^(shift/12) for a key up to one semitone (piano) or three
//     (Rhodes) from its recording, times BufRateScale so a 44.1 kHz file plays
//     at its own pitch on a 48 kHz server;
//   - the attack is 1 ms, which only stops a click: a struck string has no
//     attack to shape, and the browser's sampler has none at all;
//   - gate 0 is the damper, a ramp over `rel` seconds (pedal.mjs `damperSec`,
//     0.12 s for an ordinary key up), set in the same message as the gate;
//   - the voice frees itself when the gate's ramp ends OR the recording runs
//     out, whichever is first, so a note held past its file costs nothing.
//
// Two defs because a PlayBuf's channel count is fixed when the def is built:
// the piano FLACs are stereo and the Rhodes FLACs are mono. A mono voice writes
// out_1 only; the board's capture sums out_1 and out_2, so a mono voice is not
// doubled.
(
var dir = "POS_DEFDIR".getenv ?? "/opt/positron-board/samples/defs";
File.mkdir(dir);
[1, 2].do { |ch|
	SynthDef(("posSampler" ++ ch).asSymbol, { |out = 0, buf = 0, rate = 1, amp = 0.1, gate = 1, rel = 0.12|
		var env = EnvGen.ar(Env.asr(0.001, 1, rel, -6), gate, doneAction: 2);
		var sig = PlayBuf.ar(ch, buf, rate * BufRateScale.kr(buf), doneAction: 2);
		Out.ar(out, sig * env * amp);
	}).writeDefFile(dir);
};
("POSSAMPLER DEFS WRITTEN " ++ dir).postln;
0.exit;
)
