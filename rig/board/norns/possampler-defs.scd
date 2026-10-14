// The board sampler's two SynthDefs, written to disk; scsampler.mjs drives scsynth over OSC itself.
// Two defs because PlayBuf's channel count is fixed: piano FLACs are stereo, Rhodes mono.
// rate includes BufRateScale (44.1 kHz files on 48 kHz); gate 0 ramps over `rel` seconds.
// why: lessons/rig-board-norns.md#possampler-defs
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
