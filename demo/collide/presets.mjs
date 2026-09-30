// demo/collide/presets.mjs: the three programs `/collide/` opens with.
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
    id: 'pluck',
    label: 'Pluck',
    what: 'a narrow pulse through a resonant filter that snaps open and closes as the note dies',
    code: `// one strike that dies on its own, so letting go changes nothing
{ |freq = 110, amp = 0.25|

    // a fast attack and a 0.8 second fall, then the synth frees itself
    var env = EnvGen.kr(Env.perc(0.002, 0.8), doneAction: 2);

    // the cutoff rides the envelope, from the note up to 4 kHz above it
    var cutoff = env * 4000 + freq;

    // operators run left to right, as in SuperCollider: (env * 4000) + freq
    RLPF.ar(Pulse.ar(freq, 0.3), cutoff, 0.15) * env * amp
}`,
  },
  {
    id: 'hat',
    label: 'Hat',
    what: 'white noise with everything under 7 kHz taken out, a little to the right',
    code: `// no freq argument, so every key plays the same hat
{ |amp = 0.3|

    // a click of an envelope, 60 ms long
    var env = EnvGen.kr(Env.perc(0.001, 0.06), doneAction: 2);

    // white noise with the low end taken out
    var sig = HPF.ar(WhiteNoise.ar, 7000);

    // Pan2 makes it two channels, a little right of centre
    Pan2.ar(sig * env * amp, 0.3)
}`,
  },
];
