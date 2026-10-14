// The drum voices, each a small /collide/-subset program run on wasm scsynth: SuperCollider for
// `sendAt` timestamped hits and self-freeing nodes. No BPF, XLine or Decay, so sweeps are EnvGens.
// Operators run left to right as in SuperCollider: `a * b + c * d` is `((a * b) + c) * d`.
// See lessons/page-drums.md#drums-37

/** General MIDI's drum notes, which is what the sequencer sends and what each
 *  wire into a voice lets through. */
export const NOTE = { kick: 36, snare: 38, hhc: 42, hho: 46, clap: 39, tomlo: 45, tomhi: 50, cowbell: 56, rim: 37,
  ride: 51, crash: 49, shaker: 70, tamb: 54, claves: 75, congalo: 64, congahi: 63, tommid: 47, agogo: 67 };

/**
 * The one knob per drum on /drums/knobs/:
 *   kick pitch 30 to 110 Hz, snare snap 50 ms to 0.6 s, hho length 0.1 to 1.5 s,
 *   hhc bright 2 to 12 kHz.
 * See lessons/page-drums.md#drums-38
 */
export const PARAMS = {
  kick: { name: 'pitch', value: 50, min: 30, max: 110, unit: 'Hz' },
  snare: { name: 'snap', value: 0.2, min: 0.05, max: 0.6, unit: 's' },
  hho: { name: 'length', value: 0.5, min: 0.1, max: 1.5, unit: 's', life: true },
  hhc: { name: 'bright', value: 7000, min: 2000, max: 12000, unit: 'Hz' },
};

/** The number written in, or a named control a knob can turn. */
const num = (key, knob) => {
  const p = PARAMS[key];
  return knob ? `\\${p.name}.kr(${p.value}, spec: [${p.min}, ${p.max}])` : String(p.value);
};

const kick = (knob) => `// a sine whose pitch falls fast, plus a click at the front
{ |amp = 0.8|

    // the note the thump falls to, in Hz
    var pitch = ${num('kick', knob)};

    // the pitch falls from 110 Hz above it to it in the first 60 ms: the thump
    var sweep = EnvGen.kr(Env.perc(0.001, 0.06)) * 110 + pitch;

    // the body rings for under half a second, then the node frees itself
    var env = EnvGen.kr(Env.perc(0.002, 0.42), doneAction: 2);

    // four milliseconds of bright noise, the beater hitting the skin
    var click = HPF.ar(WhiteNoise.ar(EnvGen.kr(Env.perc(0.0005, 0.004))), 2000);

    SinOsc.ar(sweep) * env + (click * 0.3) * amp
}`;

const snare = (knob) => `// a short pitched body under a longer burst of noise
{ |amp = 0.45|

    // how long the wires ring, in seconds
    var snap = ${num('snare', knob)};

    // the drum head: 240 Hz falling to 180 Hz, gone in a tenth of a second
    var body = SinOsc.ar(EnvGen.kr(Env.perc(0.001, 0.03)) * 60 + 180)
        * EnvGen.kr(Env.perc(0.001, 0.1));

    // the wires under the drum: noise above 1.2 kHz for as long as the snap
    var wires = HPF.ar(WhiteNoise.ar(1), 1200) * EnvGen.kr(Env.perc(0.001, 1), timeScale: snap, doneAction: 2);

    body * 0.8 + wires * amp
}`;

/** Six square waves at the 808's own cymbal frequencies, mixed and filtered
 *  high, which is what makes a hat sound metallic rather than like noise. */
const METAL = 'Mix(Pulse.ar([205.3, 304.4, 369.6, 522.7, 540, 800], 0.5, 0.4))';

const hhc = (knob) => `// six square waves, filtered high, cut off after 60 ms
{ |amp = 1|

    // where the filter starts, in Hz: higher is thinner and brighter
    var bright = ${num('hhc', knob)};

    // the 808's six cymbal oscillators, mixed, only their top left in
    var metal = HPF.ar(HPF.ar(${METAL}, bright), bright);

    // a little noise for the sizzle
    var air = HPF.ar(WhiteNoise.ar(0.3), bright + 1000);

    // short: the closed hat is a tick
    var env = EnvGen.kr(Env.perc(0.001, 0.06), doneAction: 2);

    metal + air * env * amp
}`;

const hho = (knob) => `// the same metal, left to ring, and cut short by the gate
{ |amp = 1, gate = 1|

    // how long it rings, in seconds
    var length = ${num('hho', knob)};

    var metal = HPF.ar(HPF.ar(${METAL}, 7000), 7000);
    var air = HPF.ar(WhiteNoise.ar(0.3), 8000);

    // the ring, then the node frees itself
    var ring = EnvGen.kr(Env.perc(0.002, 1), timeScale: length, doneAction: 2);

    // the choke: held open while the gate is 1, gone 15 ms after it closes
    var choke = EnvGen.kr(Env.adsr(0.001, 0.01, 1, 0.015), gate, doneAction: 2);

    metal + air * ring * choke * amp
}`;

const ROWS = [
  { key: 'kick', label: 'kick', make: kick },
  { key: 'snare', label: 'snare', make: snare },
  { key: 'hho', label: 'open hat', make: hho },
  { key: 'hhc', label: 'closed hat', make: hhc },
];


// Four more, for /drums/camera/ only: clap (three noise bursts), low tom (130 to 90 Hz), high
// tom (210 to 150 Hz), cowbell (squares at 540 and 800 Hz), each distinct by ear and on a scope.
// See lessons/page-drums.md#drums-39
const clap = () => `// three quick bursts of noise and a tail, as many hands
{ |amp = 0.9|

    // the bursts: up, down, up, down, up, then a 0.15 s tail
    var env = EnvGen.kr(Env.new([0, 1, 0.15, 1, 0.15, 1, 0], [0.001, 0.01, 0.001, 0.01, 0.001, 0.15], -3), doneAction: 2);

    // noise with a resonance near 1.2 kHz and the lows taken off
    var noise = HPF.ar(RLPF.ar(WhiteNoise.ar(1), 1200, 0.5), 600);

    noise * env * amp
}`;

const tom = (from, to, len, amp) => `// a sine falling ${from} to ${to} Hz, with a little stick at the front
{ |amp = ${amp}|

    // the pitch falls over the first 80 ms
    var pitch = EnvGen.kr(Env.perc(0.001, 0.08)) * ${from - to} + ${to};

    // the body rings ${len} s, then the node frees itself
    var env = EnvGen.kr(Env.perc(0.002, ${len}), doneAction: 2);

    // two milliseconds of noise for the stick
    var stick = HPF.ar(WhiteNoise.ar(EnvGen.kr(Env.perc(0.0005, 0.002))), 3000);

    SinOsc.ar(pitch) * env + (stick * 0.2) * amp
}`;

const cowbell = () => `// the 808's two square waves at 540 and 800 Hz, filtered
{ |amp = 0.5|

    var tone = RLPF.ar(Mix(Pulse.ar([540, 800], 0.5, 0.5)), 2000, 0.6);

    // a sharp attack that drops fast, then a short ring
    var env = EnvGen.kr(Env.new([0, 1, 0.3, 0], [0.002, 0.05, 0.3], -4), doneAction: 2);

    HPF.ar(tone, 400) * env * amp
}`;

// A ninth: rim shot, sines at 455 and 1667 Hz for 40 ms over a 3 ms noise tick, the one woody
// pitched tick in the mid range.
// See lessons/page-drums.md#drums-40
const rim = () => `// the 808's rim shot: two sines, a woody tick, gone in 40 ms
{ |amp = 0.7|

    var env = EnvGen.kr(Env.perc(0.0005, 0.04), doneAction: 2);

    // two partials, the upper one quieter
    var tone = SinOsc.ar(1667) * 0.6 + SinOsc.ar(455);

    // three milliseconds of noise for the stick on the rim
    var click = HPF.ar(WhiteNoise.ar(EnvGen.kr(Env.perc(0.0002, 0.003))), 3000);

    HPF.ar(tone, 300) * env + (click * 0.4) * amp
}`;

const EXTRAS = [
  { key: 'clap', label: 'clap', make: clap },
  { key: 'tomlo', label: 'low tom', make: () => tom(130, 90, 0.4, 0.45) },
  { key: 'tomhi', label: 'high tom', make: () => tom(210, 150, 0.3, 0.4) },
  { key: 'cowbell', label: 'cowbell', make: cowbell },
  { key: 'rim', label: 'rim shot', make: rim },
];

// Nine more, for /drums/camera/'s 2x only (eighteen rows): ride, crash, shaker, tambourine,
// claves, low and high conga, mid tom, agogo, each a sound the first nine do not make.
// See lessons/page-drums.md#drums-41
const ride = () => `// six squares at inharmonic ratios, high passed, ringing
{ |amp = 0.35|
    var metal = HPF.ar(Mix(Pulse.ar([310, 456, 620, 782, 1053, 1240], 0.5, 0.25)), 3000);
    var air = HPF.ar(WhiteNoise.ar(0.12), 7000);
    var env = EnvGen.kr(Env.perc(0.002, 1.2), doneAction: 2);
    metal + air * env * amp
}`;
const crash = () => `// bright noise and metal, long
{ |amp = 0.3|
    var noise = HPF.ar(WhiteNoise.ar(0.8), 4000);
    var metal = HPF.ar(Mix(Pulse.ar([415, 587, 833, 1177], 0.5, 0.2)), 5000);
    var env = EnvGen.kr(Env.perc(0.001, 1.5), doneAction: 2);
    noise + metal * env * amp
}`;
const shaker = () => `// noise that swells in 20 ms and is gone in 80
{ |amp = 0.6|
    var noise = RLPF.ar(HPF.ar(WhiteNoise.ar(1), 5000), 8000, 0.6);
    var env = EnvGen.kr(Env.new([0, 1, 0], [0.02, 0.08], -3), doneAction: 2);
    noise * env * amp
}`;
const tamb = () => `// jingles: high squares and noise
{ |amp = 0.4|
    var jingle = HPF.ar(Mix(Pulse.ar([2500, 3200, 4100, 5300], 0.5, 0.3)), 6000);
    var noise = HPF.ar(WhiteNoise.ar(0.4), 8000);
    var env = EnvGen.kr(Env.perc(0.002, 0.25), doneAction: 2);
    jingle + noise * env * amp
}`;
const claves = () => `// one high sine, struck
{ |amp = 0.35|
    var env = EnvGen.kr(Env.perc(0.001, 0.05), doneAction: 2);
    SinOsc.ar(2500) * env * amp
}`;
const agogo = () => `// two sines a fifth apart, a bell with a note
{ |amp = 0.35|
    var env = EnvGen.kr(Env.perc(0.002, 0.3), doneAction: 2);
    SinOsc.ar(900) + (SinOsc.ar(1350) * 0.5) * env * amp
}`;

const MORE = [
  { key: 'ride', label: 'ride', make: ride },
  { key: 'crash', label: 'crash', make: crash },
  { key: 'shaker', label: 'shaker', make: shaker },
  { key: 'tamb', label: 'tambourine', make: tamb },
  { key: 'claves', label: 'claves', make: claves },
  { key: 'congalo', label: 'low conga', make: () => tom(230, 200, 0.25, 0.4) },
  { key: 'congahi', label: 'high conga', make: () => tom(330, 300, 0.18, 0.35) },
  { key: 'tommid', label: 'mid tom', make: () => tom(170, 120, 0.35, 0.42) },
  { key: 'agogo', label: 'agogo', make: agogo },
];

/**
 * The drums in grid order: name, bay node, definition, program, note, knob parameter. `extras`
 * adds EXTRAS (nine rows), `more` also MORE (eighteen). Original: lessons/page-drums.md#drums-42.
 * @param {{ knobs?: boolean, extras?: boolean, more?: boolean }} [o]
 * See lessons/page-drums.md#drums-43
 */
export function voices({ knobs = false, extras = false, more = false } = {}) {
  return [...ROWS, ...(extras || more ? EXTRAS : []), ...(more ? MORE : [])].map((r) => ({
    key: r.key, label: r.label, name: r.key, note: NOTE[r.key],
    program: r.make(knobs),
    param: knobs ? PARAMS[r.key] ?? null : null,
  }));
}

/** 000's four, with every number written in. */
export const VOICES = voices();

/** How long each hit is expected to live, seconds, so a choke is only sent to
 *  an open hat that is still ringing (a `/n_set` to a node that has already
 *  freed itself is a `/fail` from the engine). The open hat's is its length. */
export const LIFE = { kick: 0.42, snare: 0.2, hho: 0.5, hhc: 0.06 };
