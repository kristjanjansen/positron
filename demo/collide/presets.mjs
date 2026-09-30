// demo/collide/presets.mjs: the programs `/collide/` opens with.
//
// 🔴 IN THEIR OWN FILE SO THE NODE TEST COMPILES EXACTLY WHAT THE PAGE SHIPS.
// `demo/shell/sclang-lite-test.mjs` imports this list and compiles every entry;
// a copy of the text in the test would be a second set of presets that could
// drift from the page's and stay green while the page broke.
//
// ⚠️ THE COMMENTS ARE ON THEIR OWN LINE WITH A BLANK LINE AFTER, which is
// `/fau/`'s rule for the same kind of listing (*"add nl after comments"*): a
// comment says what the line under it does, and a blank line keeps the next
// statement from reading as part of it.
//
// ⚠️ EVERY ONE IS WRITTEN THE WAY SuperCollider's OWN HELP WRITES A SynthDef
// function, arguments first and `var` lines before anything else, because
// that is what somebody who knows the language will type and what they should
// be able to paste back into a real SuperCollider unchanged.

export const PRESETS = [
  {
    id: 'pad',
    label: 'Pad',
    what: 'two sawtooths slightly apart, one in each speaker, under a filter that wanders',
    code: `// a key opens the gate and letting it go closes it
{ |freq = 220, amp = 0.12, gate = 1|

    // attack, decay, sustain level, release, in seconds
    var env = EnvGen.kr(Env.adsr(0.4, 0.3, 0.7, 1.5), gate, doneAction: 2);

    // two saws 0.6 per cent apart, so they beat slowly
    var sig = Saw.ar(freq * [1, 1.006], mul: amp);

    // a low pass whose cutoff drifts between 800 and 2000 Hz
    sig = LPF.ar(sig, LFNoise1.kr(0.3, 600, 1400));

    sig * env
}`,
  },
  {
    id: 'bell',
    label: 'Bell',
    what: 'one sine bending another at a ratio of 1.4, which is why it rings like metal rather than a string',
    code: `// frequency modulation: the modulator bends the carrier's pitch
{ |freq = 440, amp = 0.1, gate = 1|

    // rings down to a quiet hum while the key is held, then lets go
    var env = EnvGen.kr(Env.adsr(0.003, 2.5, 0.15, 1.5), gate, doneAction: 2);

    // how hard the bending is, bright at the strike and gone after 1.5 s
    var index = EnvGen.kr(Env.perc(0.003, 1.5)) * freq * 4;

    // 1.4 is not a whole number, so the overtones are not harmonics
    var mod = SinOsc.ar(freq * 1.4, mul: index);

    // two carriers a hair apart, one in each speaker
    SinOsc.ar(freq * [1, 1.002] + mod, mul: amp) * env
}`,
  },
  {
    id: 'glass',
    label: 'Glass',
    what: 'four sine partials at a struck bar\'s ratios, each fading in and out on its own on each side',
    code: `// the partials of a struck bar, 1, 2.76, 5.4 and 8.93 times the note
{ |freq = 440, amp = 0.2, gate = 1|

    var env = EnvGen.kr(Env.adsr(0.02, 1, 0.6, 1.5), gate, doneAction: 2);
    var parts = freq * [1, 2.76, 5.4, 8.93];
    var level = [0.5, 0.25, 0.15, 0.1];

    // every partial swells and fades at its own slow random pace
    var left = Mix(SinOsc.ar(parts, mul: LFNoise1.kr([0.3, 0.5, 0.7, 1.1], 0.5, 0.5) * level));

    // the right side is a hair sharper and wanders separately
    var right = Mix(SinOsc.ar(parts * 1.003, mul: LFNoise1.kr([0.4, 0.6, 0.9, 1.3], 0.5, 0.5) * level));

    [left, right] * env * amp
}`,
  },
  {
    id: 'growl',
    label: 'Growl',
    what: 'a pulse whose width shakes at random, pushed into a resonant filter and then into saturation',
    code: `// a bass, best on the lowest octaves
{ |freq = 110, amp = 0.1, gate = 1|

    var env = EnvGen.kr(Env.adsr(0.005, 0.3, 0.8, 0.4), gate, doneAction: 2);

    // the pulse width jumps about eight times a second, between 0.2 and 0.8
    var width = LFNoise1.kr(8, 0.3, 0.5);
    var sig = Pulse.ar(freq * [1, 1.004], width);

    // the cutoff snaps up from twice the note and falls back
    var cutoff = EnvGen.kr(Env.perc(0.005, 0.5)) * freq * 8 + (freq * 2);
    sig = RLPF.ar(sig, cutoff, 0.2);

    // tanh squashes it, so turning the drive up adds grit, not level
    sig = (sig * 3).tanh;

    // and a high pass at 30 Hz takes out the offset a lopsided pulse leaves
    HPF.ar(sig, 30) * env * amp
}`,
  },
  {
    id: 'breath',
    label: 'Breath',
    what: 'white noise through a very narrow filter tuned to the key, so the noise itself has a pitch',
    code: `// no oscillator at all, only noise
{ |freq = 440, amp = 0.15, gate = 1|

    var env = EnvGen.kr(Env.adsr(0.3, 0.5, 0.7, 1.2), gate, doneAction: 2);

    // two separate noises, so the two speakers are not the same air
    var noise = [WhiteNoise.ar, WhiteNoise.ar];

    // the tuning wanders a quarter of a per cent either way
    var pitch = freq * LFNoise1.kr([0.7, 0.9], 0.0025, 1);

    // rq 0.01 is a filter one per cent wide, which is what makes a note
    var sig = RLPF.ar(noise, pitch, 0.01);

    // a higher note lets more noise through, so it is turned down to match
    sig * (amp / (freq / 440 + 1)) * env
}`,
  },
  {
    id: 'wah',
    label: 'Wah',
    what: 'detuned saws under a resonant filter that a slow sawtooth sweeps up and snaps down, three times a second',
    code: `// the filter moves in time, so a held chord has a rhythm
{ |freq = 220, amp = 0.06, gate = 1|

    var env = EnvGen.kr(Env.adsr(0.01, 0.2, 0.8, 0.6), gate, doneAction: 2);

    // a ramp from 0 to 1, three times a second, curved by squaring it
    var sweep = LFSaw.kr(3, 0, 0.5, 0.5).squared;

    var sig = Saw.ar(freq * [1, 1.008], mul: amp);

    // the cutoff climbs from the note to 3 kHz above it, then drops
    RLPF.ar(sig, sweep * 3000 + freq, 0.15) * env
}`,
  },
];
