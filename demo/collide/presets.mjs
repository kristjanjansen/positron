// The programs /collide/ opens with, in their own file so sclang-lite-test.mjs
// compiles exactly what the page ships. Each is written as SuperCollider help
// writes a SynthDef, so it pastes back unchanged; comments sit on their own line.
// See lessons/page-collide.md#collide-1

export const PRESETS = [
  {
    id: 'pad',
    label: 'Pad',
    what: 'two sawtooths slightly apart, one in each speaker, under a filter that wanders',
    code: `// a key opens the gate and letting it go closes it
{ |freq = 220, amp = 0.12, gate = 1|

    // the release in seconds, turned by the knob under this box
    var rel = \\rel.kr(1.5, spec: [0.05, 6, \\exp]);

    // where the filter wanders around, in Hz
    var cutoff = \\cutoff.kr(1400, 0.05, spec: [700, 6000, \\exp]);

    // how far apart the two saws are, 0.006 is 0.6 per cent
    var detune = \\detune.kr(0.006, 0.05, spec: [0, 0.02]);

    // attack, decay, sustain level, release, in seconds
    var env = EnvGen.kr(Env.adsr(0.4, 0.3, 0.7, rel), gate, doneAction: 2);

    // two saws a fraction apart, so they beat slowly
    var sig = Saw.ar(freq * [1, 1 + detune], mul: amp);

    // a low pass whose cutoff drifts 600 Hz either side of the knob
    sig = LPF.ar(sig, LFNoise1.kr(0.3, 600, cutoff));

    sig * env
}`,
  },
  {
    id: 'growl',
    label: 'Growl',
    what: 'a pulse whose width shakes at random, pushed into a resonant filter and then into saturation',
    code: `// a bass, best on the lowest octaves
{ |freq = 110, amp = 0.1, gate = 1|

    // how far the pulse width shakes either side of 0.5
    var depth = \\depth.kr(0.3, 0.05, spec: [0, 0.45]);

    // the filter's width, and lower is sharper and more resonant
    var rq = \\rq.kr(0.2, 0.05, spec: [0.05, 1, \\exp]);

    // how hard the signal is pushed into the saturation
    var drive = \\drive.kr(3, 0.05, spec: [1, 12, \\exp]);

    var env = EnvGen.kr(Env.adsr(0.005, 0.3, 0.8, 0.4), gate, doneAction: 2);

    // the pulse width jumps about eight times a second
    var width = LFNoise1.kr(8, depth, 0.5);
    var sig = Pulse.ar(freq * [1, 1.004], width);

    // the cutoff snaps up from twice the note and falls back
    var cutoff = EnvGen.kr(Env.perc(0.005, 0.5)) * freq * 8 + (freq * 2);
    sig = RLPF.ar(sig, cutoff, rq);

    // tanh squashes it, so turning the drive up adds grit, not level
    sig = (sig * drive).tanh;

    // and a high pass at 30 Hz takes out the offset a lopsided pulse leaves
    HPF.ar(sig, 30) * env * amp
}`,
  },
  {
    id: 'wah',
    label: 'Wah',
    what: 'detuned saws under a resonant filter that a slow sawtooth sweeps up and snaps down, three times a second',
    code: `// the filter moves in time, so a held chord has a rhythm
{ |freq = 220, amp = 0.06, gate = 1|

    // sweeps a second
    var rate = \\rate.kr(3, 0.05, spec: [0.5, 12, \\exp]);

    // how far above the note the filter climbs, in Hz
    var depth = \\depth.kr(3000, 0.05, spec: [300, 8000, \\exp]);

    // the filter's width, and lower is sharper and more resonant
    var rq = \\rq.kr(0.15, 0.05, spec: [0.05, 1, \\exp]);

    var env = EnvGen.kr(Env.adsr(0.01, 0.2, 0.8, 0.6), gate, doneAction: 2);

    // a ramp from 0 to 1 at the rate, curved by squaring it
    var sweep = LFSaw.kr(rate, 0, 0.5, 0.5).squared;

    var sig = Saw.ar(freq * [1, 1.008], mul: amp);

    // the cutoff climbs from the note to the depth above it, then drops
    RLPF.ar(sig, sweep * depth + freq, rq) * env
}`,
  },
];
