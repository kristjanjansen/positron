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
export const NOTE = { kick: 36, snare: 38, hhc: 42, hho: 46 };

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
  hho: { name: 'length', value: 0.5, min: 0.1, max: 1.5, unit: 's' },
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

/**
 * The four drums in grid order, top to bottom: the row's name, the bay node,
 * the definition's name on the server, its program, its note, and (with knobs)
 * the one parameter its knob turns.
 * @param {{ knobs?: boolean }} [o]
 */
export function voices({ knobs = false } = {}) {
  return ROWS.map((r) => ({
    key: r.key, label: r.label, name: r.key, note: NOTE[r.key],
    program: r.make(knobs),
    param: knobs ? PARAMS[r.key] : null,
  }));
}

/** 000's four, with every number written in. */
export const VOICES = voices();

/** How long each hit is expected to live, seconds, so a choke is only sent to
 *  an open hat that is still ringing (a `/n_set` to a node that has already
 *  freed itself is a `/fail` from the engine). The open hat's is its length. */
export const LIFE = { kick: 0.42, snare: 0.2, hho: 0.5, hhc: 0.06 };
