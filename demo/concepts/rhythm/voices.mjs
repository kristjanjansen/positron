// demo/concepts/rhythm/voices.mjs: the four drum voices /concepts/rhythm/000/ and
// /concepts/rhythm/010/ play, each a small program in /collide/'s subset of
// SuperCollider, compiled in the tab and run on scsynth compiled to WebAssembly.
//
// Asked 2026-10-12 (BACKLOG, "A rhythm concept group"): *"make new grpup
// concept rythm. make a 16 x 4 grid pad componetn (global one), 4 sc (or fau?)
// synths for kick snare hho hhc and patchbay. 000"*, then *"next drum, same but
// each synth a parameter to tweak"* for 010.
//
// WHY SUPERCOLLIDER AND NOT FAUST. Two reasons, both about machinery that
// already exists. First, `scsynth.mjs` has `sendAt`, an OSC bundle with a
// timetag that SuperSonic maps to the speakers' clock, so a hit can be handed
// over ahead of time and sound at its time: the scheduling half is already
// built. A Faust voice in this kit is one AudioWorkletNode whose parameters
// are set by message, so a gate at an exact future sample would be new code.
// Second, a drum hit is a node that starts, decays and frees itself
// (`doneAction: 2`), which is what scsynth does with no bookkeeping, four
// definitions on one engine, any number of hits overlapping. Faust would need
// a polyphonic wrapper per voice or four always-running worklets.
//
// ONE TEXT PER DRUM, TWO PAGES. Each program has one number that 010 turns
// into a knob. On 000 it is that number written in; on 010 it is a named
// control, `\name.kr(default, spec: [min, max])`, so the knob's range is the
// program's own. Same sound at the default either way.
//
// THE SUBSET HAS NO BPF, NO XLine AND NO Decay, so every sweep is an EnvGen
// scaled and offset, and every band is an HPF. That is enough for an 808-ish
// kit and keeps each program a dozen lines a reader can follow.
//
// 🔴 THE OPERATORS ARE LEFT TO RIGHT, AS IN SuperCollider: `a * b + c * d` is
// `((a * b) + c) * d`. Every last line below is written for that.

/** General MIDI's drum notes, which is what the sequencer sends and what each
 *  wire into a voice lets through. */
export const NOTE = { kick: 36, snare: 38, hhc: 42, hho: 46, clap: 39, tomlo: 45, tomhi: 50, cowbell: 56, rim: 37,
  ride: 51, crash: 49, shaker: 70, tamb: 54, claves: 75, congalo: 64, congahi: 63, tommid: 47, agogo: 67 };

/**
 * The one knob per drum on 010, and why each is the one most fun to turn.
 *   kick  pitch   the note the thump falls to, from a sub you feel (30 Hz) to
 *                 a tom (110 Hz). It retunes the whole kit's low end.
 *   snare snap    how long the wires ring, from a dry crack (50 ms) to a
 *                 splash (0.6 s). It changes the snare's character outright.
 *   hho   length  how long the open hat rings, from a short chick (0.1 s) to
 *                 a wash across four steps (1.5 s), so it changes the groove.
 *   hhc   bright  where the hat's filter starts, from a dull chick (2 kHz) to
 *                 a glassy tick (12 kHz).
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


// ── FOUR MORE, FOR /concepts/rhythm/050/ ONLY ───────────────────────────────
// Asked 2026-10-12: *"add 4 more drum isntrumets to 050"*. Chosen to read as
// different from the four above and from each other, by ear and on a scope:
//   clap     three quick noise bursts and a tail, the 808's clap. The one
//            sound in a kit that is a rhythm of its own, and nothing above is
//            made of bursts.
//   low tom  a sine falling 130 to 90 Hz over 0.4 s: pitched like the kick but
//            an octave up and longer, so it reads as a drum with a note.
//   high tom the same a fifth above, 210 to 150 Hz, shorter. With the low tom
//            it makes a fill: two notes that answer each other.
//   cowbell  two square waves at 540 and 800 Hz (the 808's own), filtered:
//            the only clearly PITCHED metal, where the hats are noise-like.
// Rim shot was the other candidate and was left out: on a laptop speaker a
// short click reads as the closed hat's tick.
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

// A NINTH, 2026-10-12, when 050 stopped dropping a picture row (*"just split
// the video up to squares. add more drum rows if needed"*):
//   rim shot  the 808's own: two sines at 455 and 1667 Hz for 40 ms over a
//             3 ms noise tick. Earlier left out because on a laptop speaker a
//             short click reads as the closed hat's tick; with the hats above
//             7 kHz and the cowbell's squares at 540 and 800, it is the one
//             PITCHED, WOODY tick in the mid range, and a ninth row has room
//             for it. A shaker or a ride would be a third noise above 7 kHz.
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

// ── NINE MORE, FOR /concepts/rhythm/050/'s 2x ONLY ──────────────────────────
// Asked 2026-10-12: *"can we deliver 2x more res button and drum instruments as
// toggle?"*. At 2x the picture is 32 by 18 squares, so eighteen rows. Each of
// these is a sound the first nine do not make:
//   ride        six squares at inharmonic ratios, filtered high, ringing 1.2 s:
//               a pitched wash, where the open hat is a short noisy one
//   crash       bright noise and metal, 1.5 s: the longest thing in the kit
//   shaker      noise with a soft 20 ms attack, 80 ms: the only sound that
//               swells rather than strikes
//   tambourine  jingles: four squares at 2.5 to 5.3 kHz with noise, 0.25 s
//   claves      one sine at 2.5 kHz for 50 ms: the highest pitched wood
//   low conga   a sine 230 to 200 Hz, 0.25 s
//   high conga  330 to 300 Hz, 0.18 s
//   mid tom     170 to 120 Hz, 0.35 s, between the two toms
//   agogo       two sines at 900 and 1350 Hz, 0.3 s: a bell with a note,
//               above the cowbell's squares
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
 * The four drums in grid order, top to bottom: the row's name, the bay node,
 * the definition's name on the server, its program, its note, and (with knobs)
 * the one parameter its knob turns.
 * `extras: true` adds the four above after them (050's eight).
 * `more: true` adds the nine after those (050's 2x eighteen).
 * @param {{ knobs?: boolean, extras?: boolean, more?: boolean }} [o]
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
